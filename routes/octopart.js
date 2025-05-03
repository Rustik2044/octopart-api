const express = require('express');
const axios = require('axios');
const router = express.Router();

const NEXAR_TOKEN_URL = 'https://identity.nexar.com/connect/token';
const NEXAR_API_URL = 'https://api.nexar.com/graphql';

const {
  NEXAR_CLIENT_ID,
  NEXAR_CLIENT_SECRET,
} = process.env;

let accessToken = null;
let tokenExpiry = null;

async function fetchAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) return accessToken;

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', NEXAR_CLIENT_ID);
  params.append('client_secret', NEXAR_CLIENT_SECRET);
  params.append('audience', 'https://api.nexar.com');

  const res = await axios.post(NEXAR_TOKEN_URL, params);
  accessToken = res.data.access_token;
  tokenExpiry = Date.now() + res.data.expires_in * 1000 - 5000;

  return accessToken;
}

async function searchOctopart(mpn) {
  const token = await fetchAccessToken();

  const query = `
    query {
      supSearch(q: "${mpn}", limit: 1) {
        results {
          part {
            mpn
            manufacturer { name }
            shortDescription
            bestDatasheet { url }
            specs {
              attribute { name }
              displayValue
            }
            sellers {
              isAuthorized
              company { name }
              offers {
                inventoryLevel
                prices { price quantity }
                orderMultiple
              }
            }
            package
          }
        }
      }
    }
  `;

  const res = await axios.post(
    NEXAR_API_URL,
    { query },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const part = res.data.data?.supSearch?.results[0]?.part;
  if (!part) return null;

  const voltageSpec = part.specs?.find(s => /voltage/i.test(s.attribute.name));

  const priceInfo = part.sellers?.find(s => s.isAuthorized)?.offers?.[0] || {};

  return {
    manufacturer: part.manufacturer?.name || null,
    mpn: part.mpn || null,
    package: part.package || null,
    voltage: voltageSpec?.displayValue || null,
    description: part.shortDescription || null,
    datasheet: part.bestDatasheet?.url || null,
    unitPrice: priceInfo.price?.[0]?.price || null,
    extPrice: priceInfo.price?.[0]?.quantity && priceInfo.price?.[0]?.price
      ? priceInfo.price[0].price * priceInfo.price[0].quantity
      : null,
    inStock: priceInfo.inventoryLevel ?? null
  };
}

router.get('/octopart/search', async (req, res) => {
  const mpn = req.query.part;
  if (!mpn) return res.status(400).json({ error: 'Missing part parameter' });

  try {
    const data = await searchOctopart(mpn);
    if (!data) return res.status(404).json({ error: 'Component not found' });

    res.json(data);
  } catch (err) {
    console.error('Octopart error:', err.message);
    res.status(500).json({ error: 'Octopart API failed' });
  }
});

module.exports = router;
