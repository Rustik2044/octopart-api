const axios = require('axios');

let token = null;

async function getAccessToken() {
  if (token) return token;

  const res = await axios.post('https://identity.nexar.com/connect/token', new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.NEXAR_CLIENT_ID,
    client_secret: process.env.NEXAR_CLIENT_SECRET
  }));

  token = res.data.access_token;
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
            shortDescription
            bestDatasheet { url }
            sellers {
              company { name }
              offers {
                clickUrl
                inventoryLevel
                moq
                sku
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

  return res.data;
}

module.exports = { searchPart };
