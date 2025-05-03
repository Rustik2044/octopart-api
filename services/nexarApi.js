const axios = require('axios');

let token = null;
let expiry = null;

async function getAccessToken() {
  if (token && expiry && Date.now() < expiry) return token;

  const res = await axios.post('https://identity.nexar.com/connect/token', new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.NEXAR_CLIENT_ID,
    client_secret: process.env.NEXAR_CLIENT_SECRET
  }));

  token = res.data.access_token;
  expiry = Date.now() + res.data.expires_in * 1000 - 5000;

  return token;
}

async function searchPart(mpn) {
  const accessToken = await getAccessToken();

  const query = `
    query {
      supSearch(q: "${mpn}", limit: 1) {
        results {
          part {
            mpn
            manufacturer { name }
            package
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
              }
            }
          }
        }
      }
    }
  `;

  const res = await axios.post('https://api.nexar.com/graphql', { query }, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const part = res.data.data?.supSearch?.results?.[0]?.part;
  if (!part) return null;

  const voltage = part.specs?.find(s => /voltage/i.test(s.attribute.name))?.displayValue ?? null;
  const authorizedSeller = part.sellers?.find(s => s.isAuthorized);
  const price = authorizedSeller?.offers?.[0]?.prices?.[0];

  return {
    manufacturer: part.manufacturer?.name ?? null,
    mpn: part.mpn ?? null,
    package: part.package ?? null,
    voltage,
    description: part.shortDescription ?? null,
    datasheet: part.bestDatasheet?.url ?? null,
    unitPrice: price?.price ?? null,
    extPrice: price?.quantity ? price.quantity * price.price : null,
    inStock: authorizedSeller?.offers?.[0]?.inventoryLevel ?? null
  };
}

module.exports = { searchPart };
