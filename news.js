const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidNormalizedUser, getContentType, fetchLatestBaileysVersion, generateWAMessageFromContent, prepareWAMessageMedia ,generateWAMessageContent,proto, Browsers } = require('@whiskeysockets/baileys');
const l = console.log;
const File = require('settings');
const fs = require('fs');
const P = require('pino');
const axios = require('axios')
const cheerio = require("cheerio");
const path = require("path");
const { tmpdir } = require("os");
const { spawn } = require("child_process");
const config = require('./settings');
const qrcode = require('qrcode-terminal');
const util = require('util');
const { File } = require('megajs');
const moment = require('moment-timezone');
const ownerNumber = ['94787072548'];

//============================================= npm package =====================================================
const mongoose = require('mongoose');


//============================================= msg =====================================================

const downloadMediaMessage = async(m, filename) => {
	if (m.type === 'viewOnceMessage') {
		m.type = m.msg.type
	}
	if (m.type === 'imageMessage') {
		var nameJpg = filename ? filename + '.jpg' : 'undefined.jpg'
		const stream = await downloadContentFromMessage(m.msg, 'image')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameJpg, buffer)
		return fs.readFileSync(nameJpg)
	} else if (m.type === 'videoMessage') {
		var nameMp4 = filename ? filename + '.mp4' : 'undefined.mp4'
		const stream = await downloadContentFromMessage(m.msg, 'video')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameMp4, buffer)
		return fs.readFileSync(nameMp4)
	} else if (m.type === 'audioMessage') {
		var nameMp3 = filename ? filename + '.mp3' : 'undefined.mp3'
		const stream = await downloadContentFromMessage(m.msg, 'audio')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameMp3, buffer)
		return fs.readFileSync(nameMp3)
	} else if (m.type === 'stickerMessage') {
		var nameWebp = filename ? filename + '.webp' : 'undefined.webp'
		const stream = await downloadContentFromMessage(m.msg, 'sticker')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameWebp, buffer)
		return fs.readFileSync(nameWebp)
	} else if (m.type === 'documentMessage') {
		var ext = m.msg.fileName.split('.')[1].toLowerCase().replace('jpeg', 'jpg').replace('png', 'jpg').replace('m4a', 'mp3')
		var nameDoc = filename ? filename + '.' + ext : 'undefined.' + ext
		const stream = await downloadContentFromMessage(m.msg, 'document')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameDoc, buffer)
		return fs.readFileSync(nameDoc)
	}
}

const sms = (conn, m) => {
	if (m.key) {
		m.id = m.key.id
		m.chat = m.key.remoteJid
		m.fromMe = m.key.fromMe
		m.isGroup = m.chat.endsWith('@g.us')
		m.sender = m.fromMe ? conn.user.id.split(':')[0]+'@s.whatsapp.net' : m.isGroup ? m.key.participant : m.key.remoteJid
	}
	if (m.message) {
		m.type = getContentType(m.message)
		m.msg = (m.type === 'viewOnceMessage') ? m.message[m.type].message[getContentType(m.message[m.type].message)] : m.message[m.type]
		if (m.msg) {
			if (m.type === 'viewOnceMessage') {
				m.msg.type = getContentType(m.message[m.type].message)
			}
			var quotedMention = m.msg.contextInfo != null ? m.msg.contextInfo.participant : ''
			var tagMention = m.msg.contextInfo != null ? m.msg.contextInfo.mentionedJid : []
			var mention = typeof(tagMention) == 'string' ? [tagMention] : tagMention
			mention != undefined ? mention.push(quotedMention) : []
			m.mentionUser = mention != undefined ? mention.filter(x => x) : []
			m.body = (m.type === 'conversation') ? m.msg : (m.type === 'extendedTextMessage') ? m.msg.text : (m.type == 'imageMessage') && m.msg.caption ? m.msg.caption : (m.type == 'videoMessage') && m.msg.caption ? m.msg.caption : (m.type == 'templateButtonReplyMessage') && m.msg.selectedId ? m.msg.selectedId : (m.type == 'buttonsResponseMessage') && m.msg.selectedButtonId ? m.msg.selectedButtonId : ''
			m.quoted = m.msg.contextInfo != undefined ? m.msg.contextInfo.quotedMessage : null
			if (m.quoted) {
				m.quoted.type = getContentType(m.quoted)
				m.quoted.id = m.msg.contextInfo.stanzaId
				m.quoted.sender = m.msg.contextInfo.participant
				m.quoted.fromMe = m.quoted.sender.split('@')[0].includes(conn.user.id.split(':')[0])
				m.quoted.msg = (m.quoted.type === 'viewOnceMessage') ? m.quoted[m.quoted.type].message[getContentType(m.quoted[m.quoted.type].message)] : m.quoted[m.quoted.type]
				if (m.quoted.type === 'viewOnceMessage') {
					m.quoted.msg.type = getContentType(m.quoted[m.quoted.type].message)
				}
				var quoted_quotedMention = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.participant : ''
				var quoted_tagMention = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.mentionedJid : []
				var quoted_mention = typeof(quoted_tagMention) == 'string' ? [quoted_tagMention] : quoted_tagMention
				quoted_mention != undefined ? quoted_mention.push(quoted_quotedMention) : []
				m.quoted.mentionUser = quoted_mention != undefined ? quoted_mention.filter(x => x) : []
				m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
					key: {
						remoteJid: m.chat,
						fromMe: m.quoted.fromMe,
						id: m.quoted.id,
						participant: m.quoted.sender
					},
					message: m.quoted
				})
				m.quoted.download = (filename) => downloadMediaMessage(m.quoted, filename)
				m.quoted.delete = () => conn.sendMessage(m.chat, { delete: m.quoted.fakeObj.key })
				m.quoted.react = (emoji) => conn.sendMessage(m.chat, { react: { text: emoji, key: m.quoted.fakeObj.key } })
			}
		}
		m.download = (filename) => downloadMediaMessage(m, filename)
	}
	
	m.reply = (teks, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { text: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyS = (stik, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { sticker: stik, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyImg = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { image: img, caption: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyVid = (vid, teks, id = m.chat, option = { mentions: [m.sender], gif: false }) => conn.sendMessage(id, { video: vid, caption: teks, gifPlayback: option.gif, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyAud = (aud, id = m.chat, option = { mentions: [m.sender], ptt: false }) => conn.sendMessage(id, { audio: aud, ptt: option.ptt, mimetype: 'audio/mpeg', contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyDoc = (doc, id = m.chat, option = { mentions: [m.sender], filename: 'undefined.pdf', mimetype: 'application/pdf' }) => conn.sendMessage(id, { document: doc, mimetype: option.mimetype, fileName: option.filename, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyContact = (name, info, number) => {
		var vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 'FN:' + name + '\n' + 'ORG:' + info + ';\n' + 'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n' + 'END:VCARD'
		conn.sendMessage(m.chat, { contacts: { displayName: name, contacts: [{ vcard }] } }, { quoted: m })
	}
	m.react = (emoji) => conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
	
	return m
}

module.exports = { sms,downloadMediaMessage }

//============================================== functions ====================================================

const getBuffer = async(url, options) => {
	try {
		options ? options : {}
		var res = await axios({
			method: 'get',
			url,
			headers: {
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			...options,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch (e) {
		console.log(e)
	}
}

const getGroupAdmins = (participants) => {
	var admins = []
	for (let i of participants) {
		i.admin !== null  ? admins.push(i.id) : ''
	}
	return admins
}

const getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`
}

const h2k = (eco) => {
	var lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E']
	var ma = Math.log10(Math.abs(eco)) / 3 | 0
	if (ma == 0) return eco
	var ppo = lyrik[ma]
	var scale = Math.pow(10, ma * 3)
	var scaled = eco / scale
	var formatt = scaled.toFixed(1)
	if (/\.0$/.test(formatt))
		formatt = formatt.substr(0, formatt.length - 2)
	return formatt + ppo
}

const isUrl = (url) => {
	return url.match(
		new RegExp(
			/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/,
			'gi'
		)
	)
}

const Json = (string) => {
    return JSON.stringify(string, null, 2)
}

const runtime = (seconds) => {
	seconds = Number(seconds)
	var d = Math.floor(seconds / (3600 * 24))
	var h = Math.floor(seconds % (3600 * 24) / 3600)
	var m = Math.floor(seconds % 3600 / 60)
	var s = Math.floor(seconds % 60)
	var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
	var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
	var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
	var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

const sleep = async(ms) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

const fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch (err) {
        return err
    }
}
//Newly Added By Me

// Newly Added

/**
 * Convert Audio to Playable WhatsApp Audio
 * @param {Buffer} buffer Audio Buffer
 * @param {String} ext File Extension
 */
function toAudio(buffer, ext) {
	return ffmpeg(buffer, ["-vn", "-ac", "2", "-b:a", "128k", "-ar", "44100", "-f", "mp3"], ext, "mp3");
}

// Convert WebP to MP4
const webp2mp4 = async (source) => {
    let form = new FormData();
    let isUrl = typeof source === "string" && /https?:\/\//.test(source);
    form.append("new-image-url", isUrl ? source : "");
    form.append("new-image", isUrl ? "" : source, "image.webp");

    let res = await fetch("https://ezgif.com/webp-to-mp4", {
        method: "POST",
        body: form,
    });
    let html = await res.text();
    let { document } = new JSDOM(html).window;
    let form2 = new FormData();
    let obj = {};
    for (let input of document.querySelectorAll("form input[name]")) {
        obj[input.name] = input.value;
        form2.append(input.name, input.value);
    }
    let res2 = await fetch("https://ezgif.com/webp-to-mp4/" + obj.file, {
        method: "POST",
        body: form2,
    });
    let html2 = await res2.text();
    let { document: document2 } = new JSDOM(html2).window;
    return new URL(document2.querySelector("div#output > p.outfile > video > source").src, res2.url).toString();
};

// Fancy Text Conversion
const fancy = async (text) => {
    try {
        const response = await axios.get("http://qaz.wtf/u/convert.cgi", {
            params: { text },
        });
        const $ = cheerio.load(response.data);
        const results = [];

        $("table > tbody > tr").each(function () {
            results.push({
                name: $(this).find("td:nth-child(1) > h6 > a").text(),
                result: $(this).find("td:nth-child(2)").text().trim(),
            });
        });

        return results.map(item => item.result).join("\n");
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
};

function ffmpeg(buffer, args = [], ext = "", ext2 = "") {
    return new Promise(async (resolve, reject) => {
        try {
            let tmp = path.join(tmpdir(), getRandom(ext));
            let out = path.join(tmpdir(), getRandom(ext2));
            
            await fs.promises.writeFile(tmp, buffer);

            // Execute ffmpeg
            const ffmpegProcess = spawn("ffmpeg", ["-y", "-i", tmp, ...args, out])
                .on("error", reject)
                .on("close", async code => {
                    try {
                        await fs.promises.unlink(tmp);

                        if (code !== 0) {
                            reject(new Error(`FFmpeg process exited with code ${code}`));
                            return;
                        }
                        const processedData = await fs.promises.readFile(out);
                        await fs.promises.unlink(out);

                        resolve(processedData);
                    } catch (e) {
                        reject(e);
                    }
                });
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson, toAudio, fancy, webp2mp4,ffmpeg };

//================================================ mongodbenv ==================================================

const envVarSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
});

const EnvVar = mongoose.model('EnvVar', envVarSchema);

module.exports = EnvVar;

//============================================= database =====================================================

// Function to get all environment variables
const readEnv = async () => {
    try {
        const envVars = await EnvVar.find({});
        const envVarObject = {};
        envVars.forEach(envVar => {
            envVarObject[envVar.key] = envVar.value;
        });
        return envVarObject;
    } catch (err) {
        console.error('Error retrieving environment variables:' + err.message);
        throw err;
    }
};

// Function to update an environment variable
const updateEnv = async (key, newValue) => {
    try {
        const result = await EnvVar.findOneAndUpdate(
            { key: key },
            { value: newValue },
            { new: true, upsert: true }
        );

        if (result) {
            console.log(`Updated ${key} to ${newValue}`);
        } else {
            console.log(`Environment variable ${key} not found`);
        }
    } catch (err) {
        console.error('Error updating environment variable:' + err.message);
        throw err;
    }
};

module.exports = {
    readEnv,
    updateEnv
};

//=========================================== mongodb.js =======================================================

const defaultEnvVariables = [
    { key: 'PREFIX', value: '.' },
    { key: 'AUTO_READ_STATUS', value: 'true' },
    { key: 'MODE', value: 'private' },
    { key: 'OWNER_REACT', value: 'true' },
    { key: 'AUTO_TIPPING', value: 'true' },
    { key: 'AUTO_READ_CMD', value: 'true' }, 
    { key: 'WELCOME', value: 'true' },
    { key: 'AUTO_VOICE', value: 'false' },
    { key: 'AUTO_STICKER', value: 'false' },
    { key: 'AUTO_REPLY', value: 'false' },
    { key: 'AUTO_AI', value: 'false' },
    { key: 'AUTO_REACT', value: 'true' },
    { key: 'LOGO', value: 'https://pomf2.lain.la/f/hxp64475.jpg' },
    { key: 'FOOTER', value: 'ＱＵＥＥＮ Ｘ ＭＤ' },
];

const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGODB);
        console.log('🛜 MongoDB Connected ✅');
        for (const envVar of defaultEnvVariables) {
            const existingVar = await EnvVar.findOne({ key: envVar.key });

            if (!existingVar) {
                await EnvVar.create(envVar);
                console.log(`➕ Created default env var: ${envVar.key}`);
            }
        }
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = connectDB;

//============================================== session  ====================================================

if (!fs.existsSync(__dirname + '/session/creds.json')) {
    if (!config.SESSION_ID) return console.log('Please add your session to SESSION_ID env !!');
    const sessdata = config.SESSION_ID;
    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
    filer.download((err, data) => {
        if (err) throw err;
        fs.writeFile(__dirname + '/session/creds.json', data, () => {
            console.log("Session downloaded ✅");
        });
    });
}

//==================================================================================================
const express = require("express");
const app = express();
const port = process.env.PORT || 8000;
//=========================================== mongodb =======================================================
async function connectToWA() {
    connectDB();
    
    const config = await readEnv();
    const prefix = config.PREFIX;
    console.log("Connecting QUEEN X MD ...");
 //==================================================================================================
    
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/session/')
    var { version } = await fetchLatestBaileysVersion();
    
    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        syncFullHistory: true,
        auth: state,
        version
    });

    
//=============================================== plugins locetion ===================================================

conn.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
        if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
            connectToWA();
        }
    } else if (connection === 'open') {
        console.log('😼 Installing Commands ... ');
        const path = require('path');
        const fs = require('fs'); // Added missing require statement for fs module
        const setting = []; // Assuming setting is defined somewhere above this code snippet
        setting.forEach((plugin) => {
            if (path.extname(plugin).toLowerCase() === ".js") {
                require(plugin); // Fixed incorrect require path
            }
        });
        

    /*
    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
                connectToWA();
            }
        } else if (connection === 'open') {
            console.log('😼 Installing Commands ... ');
            const path = require('path');
            fs.readdirSync setting.forEach((plugin) => {
                if (path.extname(plugin).toLowerCase() === ".js") {
                    require(setting + plugin);
                }
            });*/
//==================================================================================================
            console.log('Command installed successfully ✅');
            console.log('Bot connected to WhatsApp ✅');
//================================================ connect message ==================================================        
            let up = `*_📰 NEWS BOT ONLINE 📰_*\n\n📢 ඔබේ දිනපතා පුවත් සහ යාවත්කාලීන තොරතුරු මෙහිම!\n🌍 ජාත්‍යන්තර | දේශීය | ක්‍රීඩා | තාක්‍ෂණික | විනෝදාස්වාද\n\n✅ පුවත් ලබා ගැනීමට පහත විධාන භාවිතා කරන්න:\n🔹 .news latest - අලුත්ම පුවත්\n🔹 .news sport - ක්‍රීඩා පුවත්\n🔹 .news tech - තාක්ෂණික පුවත්\n🔹 .news entertainment -විනෝදාස්වාද පුවත්\n\n🔄 පුවත් මඟින් යාවත්කාලීනව සිටින්න!\n\n💬 NEWS MD BY NETHMIKA & SENURA`;
            conn.sendMessage(ownerNumber + "@s.whatsapp.net", {
                image: { url: `https://i.ibb.co/9Hkcj5TS/9622.jpg` },
                caption: up
            });
        }
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async (mek) => {
        mek = mek.messages[0];
        if (!mek.message) return;
        
//========================================================================

    const jid = mek.key.remoteJid;
    let messageContent;

    if (mek.message.conversation) {
        messageContent = mek.message.conversation;
    } else if (mek.message.extendedTextMessage) {
        messageContent = mek.message.extendedTextMessage.text;
    } else if (mek.message.reactionMessage) {
        messageContent = mek.message.reactionMessage.text;
    } else {
        messageContent = 'Unknown message type';
    }

    console.log("JID:", jid + "Message:", messageContent);

//================================ statas seen =================================================

        mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;

        if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === "true") {
            await conn.readMessages([mek.key]);
        }

//=================================== Auto Bio ==============================


if (config.autoBioEnabled === 'true'){
    await
conn.updateProfileStatus(`🧚‍♂️ QUEEN X MD 🧚‍♂️ ${moment.tz('Asia/Colombo').format('HH:mm:ss')}`)

}

//============================================================================= 

        const m = sms(conn, mek);
        const type = getContentType(mek.message);
        const content = JSON.stringify(mek.message);
        const from = mek.key.remoteJid;
        const quoted = (type === 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null) ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];
        const body = (type === 'conversation') ? mek.message.conversation :
                     (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
                     (type === 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption :
                     (type === 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : '';

        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const isGroup = from.endsWith('@g.us');
        const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const botNumber = conn.user.id.split(':')[0];
        const pushname = mek.pushName || 'Sin Nombre';
        const isMe = botNumber.includes(senderNumber);
        const isOwner = ownerNumber.includes(senderNumber) || isMe;
        const botNumber2 = await jidNormalizedUser(conn.user.id);
        const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => { }) : '';
        const groupName = isGroup ? groupMetadata.subject : '';
        const participants = isGroup ? await groupMetadata.participants : [];
        const groupAdmins = isGroup ? await getGroupAdmins(participants) : [];
        const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
        const isReact = m.message.reactionMessage ? true : false;

        const reply = (teks) => {
            conn.sendMessage(from, { text: teks }, { quoted: mek });
        };

        //==================================================================================================
        
        conn.sendButtonMessage = async (jid, buttons, opts = {}) => {
  
        let header;
        if (opts?.video) {
            var video = await prepareWAMessageMedia({
                video: {
                    url: opts && opts.video ? opts.video : ''
                }
            }, {
                upload: conn.waUploadToServer
            })
            header = {
                title: opts && opts.header ? opts.header : '',
                hasMediaAttachment: true,
                videoMessage: video.videoMessage,
            }
  
        } else if (opts?.image) {
            var image = await prepareWAMessageMedia({
                image: {
                    url: opts && opts.image ? opts.image : ''
                }
            }, {
                upload: conn.waUploadToServer
            })
            header = {
                title: opts && opts.header ? opts.header : '',
                hasMediaAttachment: true,
                imageMessage: image.imageMessage,
            }
  
        } else {
            header = {
                title: opts && opts.header ? opts.header : '',
                hasMediaAttachment: false,
            }
        }
        let interactiveMessage;
        if (opts && opts.contextInfo) {
            interactiveMessage = {
                body: {
                    text: opts && opts.body ? opts.body : ''
                },
                footer: {
                    text: opts && opts.footer ? opts.footer : ''
                },
                header: header,
                nativeFlowMessage: {
                    buttons: buttons,
                    messageParamsJson: ''
                },
                contextInfo: opts && opts.contextInfo ? opts.contextInfo : ''
            }
        } else {
            interactiveMessage = {
                body: {
                    text: opts && opts.body ? opts.body : ''
                },
                footer: {
                    text: opts && opts.footer ? opts.footer : ''
                },
                header: header,
                nativeFlowMessage: {
                    buttons: buttons,
                    messageParamsJson: ''
                }
            }
        }
  
        let message = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                    },
                    interactiveMessage: interactiveMessage
                }
            }
        }, {
  
        })
  
        return await conn.relayMessage(jid, message["message"], {
            messageId: message.key.id
        })
    }

            conn.ev.on('messages.upsert', async (m) => {
                const messages = m.messages || [];
                for (const message of messages) {
                    try {
                        if (!message || !message.key || !message.message) continue;
            
                        const type = getContentType(message.message);
                        const btnResponse = (type === 'interactiveResponseMessage') ? message.message.interactiveResponseMessage : null;
            
                        if (btnResponse) {
                            const buttonId = btnResponse.buttonId;
                            console.log(`Button clicked with ID: ${buttonId}`);
                        }
        
                        if (message.message.conversation) {
                            await handleCommands(message.key.remoteJid, message.message.conversation, conn);
                        }
            
                    } catch (error) {
                        console.error('Error handling message:', error);
                    }
                }
            });

        //==================================================================================================

        conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
            let mime = '';
            let res = await axios.head(url);
            mime = res.headers['content-type'];
            if (mime.split("/")[1] === "gif") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options }, { quoted: quoted, ...options });
            }
            let type = mime.split("/")[0] + "Message";
            if (mime === "application/pdf") {
                return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options }, { quoted: quoted, ...options });
            }
            if (mime.split("/")[0] === "image") {
                return conn.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options }, { quoted: quoted, ...options });
            }
            if (mime.split("/")[0] === "video") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options });
            }
            if (mime.split("/")[0] === "audio") {
                return conn.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options });
            }
        };
//===================================Auto Recct=========================================
        /*
        if (config.AUTO_REACT === 'true') { 
    if (isReact) return;
    const emojis = ["🩷", "🔥", "✨", "🔮", "♠️", "🪄", "🔗", "🫧", "🪷", "🦠", "🌺", "🐬", "🦋", "🍁", "🌿", "🍦", "🌏", "✈️", "❄️"];
    
    emojis.forEach(emoji => {
      m.react(emoji);
    });
        }
       

        // Auto React 
if (!isReact && senderNumber !== botNumber) {
    if (config.AUTO_REACT === 'true') {
        const reactions = ['😊', '👍', '😂', '💯', '🔥', '🙏', '🎉', '👏', '😎', '🤖', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🏵', '🏰', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🚣', '🛥', '🚂', '🚁', '🚀', '🛸', '🛹', '🚴', '🚲', '🛺', '🚮', '🚯', '🚱', '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🏵', '🏰', '🏠', '🏡', '🏢', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🚣', '🛥', '🚂', '🚁', '🚀', '🛸', '🛹', '🚴', '🚲', '🛺', '🚮', '🚯', '🚱', '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🏵', '🏰', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🚣', '🛥', '🚂', '🚁', '🚀', '🛸', '🛹', '🚴', '🚲', '🛺', '🚮', '🚯', '🚱', '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '🙂', '😑', '🤣', '😍', '😘', '😗', '😙', '😚', '😛', '😝', '😞', '😟', '😠', '😡', '😢', '😭', '😓', '😳', '😴', '😌', '😆', '😂', '🤔', '😒', '😓', '😶', '🙄', '🐶', '🐱', '🐔', '🐷', '🐴', '🐲', '🐸', '🐳', '🐋', '🐒', '🐑', '🐕', '🐩', '🍔', '🍕', '🥤', '🍣', '🍲', '🍴', '🍽', '🍹', '🍸', '🎂', '📱', '📺', '📻', '🎤', '📚', '💻', '📸', '📷', '❤️', '💔', '❣️', '☀️', '🌙', '🌃', '🏠', '🚪', "🇺🇸", "🇬🇧", "🇨🇦", "🇦🇺", "🇯🇵", "🇫🇷", "🇪🇸", '👍', '👎', '👏', '👫', '👭', '👬', '👮', '🤝', '🙏', '👑', '🌻', '🌺', '🌸', '🌹', '🌴', "🏞️", '🌊', '🚗', '🚌', "🛣️", "🛫️", "🛬️", '🚣', '🛥', '🚂', '🚁', '🚀', "🏃‍♂️", "🏋️‍♀️", "🏊‍♂️", "🏄‍♂️", '🎾', '🏀', '🏈', '🎯', '🏆', '??', '⬆️', '⬇️', '⇒', '⇐', '↩️', '↪️', 'ℹ️', '‼️', '⁉️', '‽️', '©️', '®️', '™️', '🔴', '🔵', '🟢', '🔹', '🔺', '💯', '👑', '🤣', "🤷‍♂️", "🤷‍♀️", "🙅‍♂️", "🙅‍♀️", "🙆‍♂️", "🙆‍♀️", "🤦‍♂️", "🤦‍♀️", '🏻', '💆‍♂️', "💆‍♀️", "🕴‍♂️", "🕴‍♀️", "💇‍♂️", "💇‍♀️", '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '�', '🏯', '🏰', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🚣', '🛥', '🚂', '🚁', '🚀', '🛸', '🛹', '🚴', '🚲', '🛺', '🚮', '🚯', '🚱', '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🌳', '🌲', '🌾', '🌿', '🍃', '🍂', '🍃', '🌻', '💐', '🌹', '🌺', '🌸', '🌴', '🏵', '🎀', '🏆', '🏈', '🏉', '🎯', '🏀', '🏊', '🏋', '🏌', '🎲', '📚', '📖', '📜', '📝', '💭', '💬', '🗣', '💫', '🌟', '🌠', '🎉', '🎊', '👏', '💥', '🔥', '💥', '🌪', '💨', '🌫', '🌬', '🌩', '🌨', '🌧', '🌦', '🌥', '🌡', '🌪', '🌫', '🌬', '🌩', '🌨', '🌧', '🌦', '🌥', '🌡', '🌪', '🌫', '🌬', '🌩', '🌨', '🌧', '🌦', '🌥', '🌡', '🌱', '🌿', '🍃', '🍂', '🌻', '💐', '🌹', '🌺', '🌸', '🌴', '🏵', '🎀', '🏆', '🏈', '🏉', '🎯', '🏀', '🏊', '🏋', '🏌', '🎲', '📚', '📖', '📜', '📝', '💭', '💬', '🗣', '💫', '🌟', '🌠', '🎉', '🎊', '👏', '💥', '🔥', '💥', '🌪', '💨', '🌫', '🌬', '🌩', '🌨', '🌧', '🌦', '🌥', '🌡', '🌪', '🌫', '🌬', '🌩', '🌨', '🌧', '🌦', '🌥', '🌡', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🏵', '🏰', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏧', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🚣', '🛥', '🚂', '🚁', '🚀', '🛸', '🛹', '🚴', '🚲', '🛺', '🚮', '🚯', '🚱', '🚫', '🚽', "🕳️", '💣', '🔫', "🕷️", "🕸️", '💀', '👻', '🕺', '💃', "🕴️", '👶', '👵', '👴', '👱', '👨', '👩', '👧', '👦', '👪', '👫', '👭', '👬', '👮', "🕴️", '💼', '📊', '📈', '📉', '📊', '📝', '📚', '📰', '📱', '💻', '📻', '📺', '🎬', "📽️", '📸', '📷', "🕯️", '💡', '🔦', '🔧', '🔨', '🔩', '🔪', '🔫', '👑', '👸', '🤴', '👹', '🤺', '🤻', '👺', '🤼', '🤽', '🤾', '🤿', '🦁', '🐴', '🦊', '🐺', '🐼', '🐾', '🐿', '🦄', '🦅', '🦆', '🦇', '🦈', '🐳', '🐋', '🐟', '🐠', '🐡', '🐙', '🐚', '🐜', '🐝', '🐞', "🕷️", '🦋', '🐛', '🐌', '🐚', '🌿', '🌸', '💐', '🌹', '🌺', '🌻', '🌴', '🏵', '🏰', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', "🐕‍🦺", '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', "🐈‍⬛", '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🦬', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', "🐿️", '🦫', '🦔', '🦇', '🐻', "🐻‍❄️", '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', "🕊️", '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', "😶‍🌫️", '😏', '😒', '🙄', '😬', "😮‍💨", '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', "😵‍💫", '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', "❤️‍🔥", "❤️‍🩹", '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨', "🕳️", '💣', '💬', "👁️‍🗨️", "🗨️", "🗯️", '💭', '💤', '👋', '🤚', "🖐️", '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', "👁️", '👅', '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', "🧔‍♂️", "🧔‍♀️", "👨‍🦰", "👨‍🦱", "👨‍🦳", "👨‍🦲", '👩', "👩‍🦰", "🧑‍🦰", "👩‍🦱", "🧑‍🦱", "👩‍🦳", "🧑‍🦳", "👩‍🦲", "🧑‍🦲", "👱‍♀️", "👱‍♂️", '🧓', '👴', '👵', '🙍', "🙍‍♂️", "🙍‍♀️", '🙎', "🙎‍♂️", "🙎‍♀️", '🙅', "🙅‍♂️", "🙅‍♀️", '🙆', "🙆‍♂️", "🙆‍♀️", '💁', "💁‍♂️", "💁‍♀️", '🙋', "🙋‍♂️", "🙋‍♀️", '🧏', "🧏‍♂️", "🧏‍♀️", '🙇', "🙇‍♂️", "🙇‍♀️", '🤦', "🤦‍♂️", "🤦‍♀️", '🤷', "🤷‍♂️", "🤷‍♀️", "🧑‍⚕️", "👨‍⚕️", "👩‍⚕️", "🧑‍🎓", "👨‍🎓", "👩‍🎓", "🧑‍🏫", '👨‍🏫', "👩‍🏫", "🧑‍⚖️", "👨‍⚖️", "👩‍⚖️", "🧑‍🌾", "👨‍🌾", "👩‍🌾", "🧑‍🍳", "👨‍🍳", "👩‍🍳", "🧑‍🔧", "👨‍🔧", "👩‍🔧", "🧑‍🏭", "👨‍🏭", "👩‍🏭", "🧑‍💼", "👨‍💼", "👩‍💼", "🧑‍🔬", "👨‍🔬", "👩‍🔬", "🧑‍💻", "👨‍💻", "👩‍💻", "🧑‍🎤", "👨‍🎤", "👩‍🎤", "🧑‍🎨", "👨‍🎨", "👩‍🎨", "🧑‍✈️", "👨‍✈️", "👩‍✈️", "🧑‍🚀", "👨‍🚀", "👩‍🚀", "🧑‍🚒", "👨‍🚒", "👩‍🚒", '👮', "👮‍♂️", "👮‍♀️", "🕵️", "🕵️‍♂️", "🕵️‍♀️", '💂', "💂‍♂️", "💂‍♀️", '🥷', '👷', "👷‍♂️", "👷‍♀️", '🤴', '👸', '👳', "👳‍♂️", "👳‍♀️", '👲', '🧕', '🤵', "🤵‍♂️", "🤵‍♀️", '👰', "👰‍♂️", "👰‍♀️", '🤰', '🤱', "👩‍🍼", "👨‍🍼", "🧑‍🍼", '👼', '🎅', '🤶', "🧑‍🎄", '🦸', "🦸‍♂️", "🦸‍♀️", '🦹', "🦹‍♂️", "🦹‍♀️", '🧙', "🧙‍♂️", "🧙‍♀️", '🧚', "🧚‍♂️", "🧚‍♀️", '🧛', "🧛‍♂️", "🧛‍♀️", '🧜', "🧜‍♂️", "🧜‍♀️", '🧝', "🧝‍♂️", "🧝‍♀️", '🧞', "🧞‍♂️", "🧞‍♀️", '🧟', "🧟‍♂️", "🧟‍♀️", '💆', "💆‍♂️", "💆‍♀️", '💇', "💇‍♂️", "💇‍♀️", '🚶', "🚶‍♂️", "🚶‍♀️", '🧍', "🧍‍♂️", "🧍‍♀️", '🧎', "🧎‍♂️", "🧎‍♀️", "🧑‍🦯", "👨‍🦯", "👩‍🦯", "🧑‍🦼", "👨‍🦼", "👩‍🦼", "🧑‍🦽", "👨‍🦽", "👩‍🦽", '🏃', "🏃‍♂️", "🏃‍♀️", '💃', '🕺', "🕴️", '👯', "👯‍♂️", "👯‍♀️", '🧖', "🧖‍♂️", "🧖‍♀️", '🧗', "🧗‍♂️", "🧗‍♀️", '🤺', '🏇', '⛷️', '🏂', "🏌️", "🏌️‍♂️", "🏌️‍♀️", '🏄', "🏄‍♂️", "🏄‍♀️", '🚣', "🚣‍♂️", "🚣‍♀️", '🏊', "🏊‍♂️", "🏊‍♀️", '⛹️', "⛹️‍♂️", "⛹️‍♀️", "🏋️", "🏋️‍♂️", "🏋️‍♀️", '🚴', "🚴‍♂️", '🚴‍♀️', '🚵', "🚵‍♂️", "🚵‍♀️", '🤸', "🤸‍♂️", "🤸‍♀️", '🤼', "🤼‍♂️", "🤼‍♀️", '🤽', "🤽‍♂️", "🤽‍♀️", '🤾', "🤾‍♂️", "🤾‍♀️", '🤹', "🤹‍♂️", "🤹‍♀️", '🧘', "🧘‍♂️", "🧘‍♀️", '🛀', '🛌', "🧑‍🤝‍🧑", '👭', '👫', '👬', '💏', "👩‍❤️‍💋‍👨", "👨‍❤️‍💋‍👨", "👩‍❤️‍💋‍👩", '💑', "👩‍❤️‍👨", "👨‍❤️‍👨", "👩‍❤️‍👩", '👪', "👨‍👩‍👦", "👨‍👩‍👧", "👨‍👩‍👧‍👦", "👨‍👩‍👦‍👦", "👨‍👩‍👧‍👧", "👨‍👨‍👦", '👨‍👨‍👧', "👨‍👨‍👧‍👦", "👨‍👨‍👦‍👦", "👨‍👨‍👧‍👧", "👩‍👩‍👦", "👩‍👩‍👧", "👩‍👩‍👧‍👦", "👩‍👩‍👦‍👦", "👩‍👩‍👧‍👧", "👨‍👦", "👨‍👦‍👦", "👨‍👧", "👨‍👧‍👦", "👨‍👧‍👧", "👩‍👦", "👩‍👦‍👦", "👩‍👧", "👩‍👧‍👦", "👩‍👧‍👧", "🗣️", '👤', '👥', '🫂', '👣', '🦰', '🦱', '🦳', '🦲', '🐵'];

        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)]; // 
        m.react(randomReaction);
    }
}
*/
//===================================Owner React=========================================

        if (config.OWNER_REACT === "true") {
            if (senderNumber.includes(ownerNumber)) {
                if (isReact) return;
                m.react("💃");
            }
        }

//===================================Work Type========================================= 

        if (!isOwner && config.MODE === "private") return;
        if (!isOwner && isGroup && config.MODE === "inbox") return;
        if (!isOwner && !isGroup && config.MODE === "groups") return;

//==========================Auto Read============================

if (isCmd && config.AUTO_READ_CMD === "true") {
    await conn.readMessages([mek.key]) 
}

//==========================Auto Typing============================

if (isCmd && config.AUTO_TIPPING === "true") {
    await conn.sendPresenceUpdate('composing', from)
}

//==================================================================
        
        const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;

        if (isCmd) {
            const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName)) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
            if (cmd) {
                if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
                try {
                    cmd.function(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
                } catch (e) {
                    console.error("[PLUGIN ERROR] " + e);
                }
            }
        }
             
        events.commands.map(async(command) => {
            if (body && command.on === "body") {
            command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
            } else if (mek.q && command.on === "text") {
            command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
            } else if (
            (command.on === "image" || command.on === "photo") &&
            mek.type === "imageMessage"
            ) {
            command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
            } else if (
            command.on === "sticker" &&
            mek.type === "stickerMessage"
            ) {
            command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
            }});

    });


    function handleCommands(conn, mek, m, context) {
        const { isCmd, command, from, quoted, body } = context;
        const events = require('../news/command');
        const cmdName = isCmd ? command : false;
    
        try {
            if (isCmd) {
                const cmd =
                    events.commands.find(c => c.pattern === cmdName) ||
                    events.commands.find(c => c.alias && c.alias.includes(cmdName));
    
                if (cmd) {
                    if (cmd.react) {
                        conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
                    }
                    cmd.function(conn, mek, m, context);
                }
            }

            events.commands.forEach(async (command) => {
                if (body && command.on === "body") {
                    command.function(conn, mek, m, context);
                } else if (mek.q && command.on === "text") {
                    command.function(conn, mek, m, context);
                } else if (
                    (command.on === "image" || command.on === "photo") &&
                    mek.message?.imageMessage
                ) {
                    command.function(conn, mek, m, context);
                } else if (
                    command.on === "sticker" &&
                    mek.message?.stickerMessage
                ) {
                    command.function(conn, mek, m, context);
                }
            });
        } catch (error) {
            console.error("[HANDLE COMMANDS ERROR] Command: " + cmdName + " | Error: " + error.message);
        }
    }
    
    conn.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };

//==================================================auto status===========================================================





cmd({
    pattern: "ping",
    desc: "Check bot's response time.",
    category: "main",
    react: "🪄",
    filename: __filename
}, async (conn, mek, m, { from, quoted, reply }) => {
    try {
         
        const startTime = Date.now();
        const message = await conn.sendMessage(from, { text: '```SPEED TEST```' });
        const endTime = Date.now();
        const ping = endTime - startTime;

        // Send the ping response without buttons
        await conn.sendMessage(from, { text: `*Pong*\n*${ping}ms*` }, { quoted: message })
    } catch (e) {
        console.error(e);
        reply(`${e}`);
  }
});
    



//------------------------------antibad-----------------------------------//


//=============================================================-

    
    if (config.WELCOME === "true") {
        conn.ev.on('group-participants.update', async (anu) => {
            const metadata = await conn.groupMetadata(anu.id);
            const participants = anu.participants;
            for (let num of participants) {
                let ppuser;
                try {
                    ppuser = await conn.profilePictureUrl(num, 'image');
                } catch {
                    ppuser = 'https://pomf2.lain.la/f/hxp64475.jpg';
                }
    
                if (anu.action == 'add') {
                    conn.sendMessage(anu.id, { text: `Hi @${num.split("@")[0]}, Welcome to ${metadata.subject}\nFeel Free To Introduce Your Self To The Group\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴇᴛʜᴍɪᴋᴀ-ᴛᴇᴄʜ*`, contextInfo: { mentionedJid: [num] } });
                } else if (anu.action == 'remove') {
                    conn.sendMessage(anu.id, { text: `Goodbye @${num.split("@")[0]}!\nSee You Next Time\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴇᴛʜᴍɪᴋᴀ-ᴛᴇᴄʜ*`, contextInfo: { mentionedJid: [num] } });
                }
            }
        });
    }
}

// Connect to WhatsApp
connectToWA();  // Ensure that this function is correctly defined elsewhere in your code
// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
