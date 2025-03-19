const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "XoxwlaIa#KpE-K87gN5ZX9Qwn3tN0tSlW6HyBJ03Yeb30gwkDkeU",
AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "true",
};
