// dev-commands.js
require('dotenv').config();
const Telegraf = require('telegraf');
const helper = require('./helper-functions');
const main = require('./index');
const API_TOKEN = process.env.API_TOKEN || '';
const DEV_ID = process.env.DEV_ID || '';
const bot = new Telegraf(API_TOKEN);

const mysql = require('mysql');

const pool = mysql.createPool({
	host : process.env.MYSQLHOST,
	user : process.env.MYSQLUSER,
	password : process.env.MYSQLPASS,
	database : process.env.MYSQLDB,
	charset : 'utf8mb4'
});

var chatList = [];

module.exports.addChat = (chat, request) => {
	for (i=0;i<chatList.length;i++) {
		if (chatList[i].id == chat.id) {
			return false;
		}
	}
	chatList[chatList.length] = chat;
	if (request != 'silent') {
		if (chat.title != undefined) {
			bot.telegram.sendMessage(DEV_ID, `Group: *${chat.title}*, Chat ID: *${chat.id}* added to chatList.`, {parse_mode: 'Markdown'});
			console.log(`Group: ${chat.title}, Chat ID: ${chat.id} added to chatList.`);
		} else {
			bot.telegram.sendMessage(DEV_ID, `User: *${chat.username}*, Chat ID: *${chat.id}* added to chatList.`, {parse_mode: 'Markdown'});
			console.log(`User: ${chat.username}, Chat ID: ${chat.id} added to chatList.`);
		}
	}
};

module.exports.listChats = async () => {
	var listCount = chatList.length;
	var list = `*You have ${listCount} Chats:*\n`
	var total = 0;
	var n = 0;
	var foo;
	while (total<listCount) {
		if (chatList[total].type != "private") {
			list += `Chat *${total}* - Group: *${chatList[total].title}*, ID: *${chatList[total].id}*\n`
		} else {
			list += `Chat *${total}* - User: *${chatList[total].username}*, ID: *${chatList[total].id}*\n`
		}
		n++;
		total++;
		if (total == listCount) {
			foo = await bot.telegram.sendMessage(DEV_ID, list, {parse_mode: 'Markdown'});
		} else if (n >= 30) {
			foo = await bot.telegram.sendMessage(DEV_ID, list, {parse_mode: 'Markdown'});
			list = ``;
			n = 0;
		};
	}
};

module.exports.checkChats = (inputId) => {
	for (i=0;i<chatList.length;i++) {
		if (chatList[i].id == inputId) {
			return true;
		}
	}
	return false;
}

module.exports.removeChat = (chat) => {
	for (i=0;i<chatList.length;i++) {
		if (chatList[i].id == chat.id) chatList.splice(chatList.indexOf(chatList[i]),1);
	}
	if (chat.type != "private") {
		bot.telegram.sendMessage(DEV_ID, `Group: *${chat.title}*, Chat ID: *${chat.id}* removed from chatList.`, {parse_mode: 'Markdown'});
		console.log(`Group: ${chat.title}, Chat ID: ${chat.id} removed from chatList.`);
	} else {
		bot.telegram.sendMessage(DEV_ID, `User: *${chat.username}*, Chat ID: *${chat.id}* removed from chatList.`, {parse_mode: 'Markdown'});
		console.log(`User: ${chat.username}, Chat ID: ${chat.id} removed from chatList.`);
	}
}

module.exports.announceAll = async (ctx) => {
	var announcement = ctx.message.text.replace(`/dev_announceall`,``);
	var nSent = 0;
	var i = 0;
	while (i<chatList.length) {
		try {
			var targetchat = await bot.telegram.getChat(chatList[i].id);
			var sendOne = await bot.telegram.sendMessage(chatList[i].id, announcement, {parse_mode: 'Markdown'}).then().catch(function(error) {
				if (error == "Error: 403: Forbidden: bot was kicked from the group chat" || error == "Error: 403: Forbidden: bot was blocked by the user") {
					main.purgeChat(targetchat, error);
					i--;
				} else {
					console.log(`Error for ${chat.id}! `+error);
				}
			});
			nSent++;
		} catch (err) {
			let targetchat = await bot.telegram.getChat(chatList[i].id);
			if (targetchat.title != undefined) {
				bot.telegram.sendMessage(DEV_ID, `Error "${err}" when trying to send to Group: ${targetchat.title}, Chat ID: ${targetchat.id}.`, {parse_mode: 'Markdown'});
				console.log(`Error "${err}" when trying to send to Group: ${targetchat.title}, Chat ID: ${targetchat.id}.`);
			} else {
				bot.telegram.sendMessage(DEV_ID, `Error "${err}" when trying to send to User: ${targetchat.username}, Chat ID: ${targetchat.id}.`, {parse_mode: 'Markdown'});
				console.log(`Error "${err}" when trying to send to User: ${targetchat.username}, Chat ID: ${targetchat.id}.`);
			}
		}
		i++;
	}
	bot.telegram.sendMessage(DEV_ID, `Announced to *${nSent}* chats(s).`, {parse_mode: 'Markdown'});
}

module.exports.announceUsers = async (ctx) => {
	var announcement = ctx.message.text.replace(`/dev_announceusers`,``);
	var nSent = 0;
	for (i=0;i<chatList.length;i++) {
		if (chatList[i].type === "private") {
			try {
				bot.telegram.sendMessage(chatList[i].id, announcement, {parse_mode: 'Markdown'}).then().catch(function(error) {
					if (error == "Error: 403: Forbidden: bot was kicked from the group chat" || error == "Error: 403: Forbidden: bot was blocked by the user") {
						main.purgeChat(chatList[i], error);
					} else {
						console.log(`Error for ${chat.id}! `+error);
					}
				});
				nSent++;
			} catch (err) {
				let targetchat = await bot.telegram.getChat(chatList[i].id);
				bot.telegram.sendMessage(DEV_ID, `Error "${err}" when trying to send to User: ${targetchat.username}, Chat ID: ${targetchat.id}.`, {parse_mode: 'Markdown'});
				console.log(`Error "${err}" when trying to send to User: ${targetchat.username}, Chat ID: ${targetchat.id}.`);
			}
		}
	}
	bot.telegram.sendMessage(DEV_ID, `Announced to *${nSent}* users(s).`, {parse_mode: 'Markdown'});
}

// refreshChatList = () => {
// 	bot.telegram.sendMessage(DEV_ID, `Refreshing chatList...`, {parse_mode: 'Markdown'});
// 	console.log(`Refreshing chatList...`);
// 	for (i=0;i<chatList.length;i++) {
// 		try {
// 			sendChatAction(chatList[i].id, {action : 'typing'});
// 		} catch (err) {
// 			if (err.name == 403 || err.name == 400) {
// 				bot.telegram.sendMessage(DEV_ID, `Removing ${chatList[i].id} from chatList...`, {parse_mode: 'Markdown'});
// 				console.log(`Removing ${chatList[i].id} from chatList...`);
// 				chatList.splice(i,1);
// 			}
// 		}
// 	}
// 	chatList.sort();
// 	bot.telegram.sendMessage(DEV_ID, `Chatlist refreshed.`, {parse_mode: 'Markdown'});
// 	console.log(`Chatlist refreshed.`)
// }

// module.exports.refreshChatList = refreshChatList();

module.exports.announceOne = async (chatid, ctx) => {
	var targetchat = await bot.telegram.getChat(chatid);
	var announcement = ctx.message.text;
	if (targetchat.title != undefined) {
		bot.telegram.sendMessage(DEV_ID, `Announcing "${announcement}" to Group: *${targetchat.title}*, Chat ID: *${chatid}*...`, {parse_mode: 'Markdown'});
		console.log(`Announcing "${announcement}" to Group: ${targetchat.title}, Chat ID: *${chatid}*...`);
	} else {
		bot.telegram.sendMessage(DEV_ID, `Announcing "${announcement}" to User: *${targetchat.username}*, Chat ID: *${chatid}*...`, {parse_mode: 'Markdown'});
		console.log(`Announcing "${announcement}" to User: ${targetchat.username}, Chat ID: *${chatid}*...`);
	}
	bot.telegram.sendMessage(chatid, announcement, {parse_mode: 'Markdown'}).then(function(resp) {
		console.log("Announcement successful!");
	}).catch(function(error) {
		if (error == "Error: 403: Forbidden: bot was kicked from the group chat" || error == "Error: 403: Forbidden: bot was blocked by the user") {
			main.purgeChat(targetchat, error);
		} else {
			console.log(`Error for ${targetchat.id}! `+error);
		}
	});
}
