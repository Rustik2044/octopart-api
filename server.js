require('dotenv').config();
const express = require('express');
const app = express();

const octopartRoutes = require('./routes/octopart');
app.use('/octopart', octopartRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Octopart server running on port ${PORT}`));
