// index.js
// Tempusu Bot by Tan Yi Jia, 2020

require('dotenv').config();
const Telegraf = require('telegraf');
const schedule = require('node-schedule');
const helper = require('./helper-functions');
const devcommands = require('./dev-commands');

const express = require('express');
const app = express();
const mysql = require('mysql');

const pool = mysql.createPool({
	host : process.env.MYSQLHOST,
	user : process.env.MYSQLUSER,
	password : process.env.MYSQLPASS,
	database : process.env.MYSQLDB,
	charset : 'utf8mb4'
});

const API_TOKEN = process.env.API_TOKEN || '';
const DEV_ID = process.env.DEV_ID || '';
const URL = process.env.URL || 'https://tempusu-bot.herokuapp.com/';
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(API_TOKEN);
bot.telegram.setWebhook(`${URL}/bot${API_TOKEN}`);
bot.startWebhook(`/bot${API_TOKEN}`, null, PORT);

bot.telegram.getMe().then((botInfo) => {
  bot.options.username = botInfo.username
});

var groupNum = 0;
var groupRun = 0;

var initialisecheck = [];
var startcheck = [];
var reminder = [];
var editcheck = []; // 0 is none, 1 is create, 2 is remove, 3 is reset
var edituser = [];
var done = [];


// Dev Commands

var devcheck = 0;
var AOStore = 0;

bot.command('dev_announceall', (ctx) => {
	if (ctx.message.from.id == DEV_ID && devcheck == 0) {
		devcheck = 1;
		bot.telegram.sendMessage(DEV_ID, `Type the announcement now, or /canceldev to cancel.`)
	}
});

bot.command('dev_announceone', (ctx) => {
	if (ctx.message.from.id == DEV_ID && devcheck == 0) {
		var inputId = ctx.message.text.replace(`/dev_announceone`,``).trim();
		if (inputId != '') {
			if (devcommands.checkChats(inputId) == true) {
				AOStore = inputId;
				bot.telegram.sendMessage(DEV_ID, `Send me the announcement for ${AOStore}.`)
				devcheck = 3;
			} else {
				devcheck = 2;
				bot.telegram.sendMessage(DEV_ID, `Unable to find chat ID. Try again or /canceldev. Otherwise, /persist ID-HERE.`);
			}
		} else {
			devcheck = 2;
			bot.telegram.sendMessage(DEV_ID, `Send me the target User/Group Chat ID, or /canceldev to cancel.`)
		}
	}
});


bot.command('dev_listreminders', (ctx) => {
	if (ctx.message.from.id == DEV_ID && devcheck == 0) {
		var inputId = ctx.message.text.replace(`/dev_listreminders`,``).trim();
		if (inputId != '') {
			if (devcommands.checkChats(inputId) == true) {
				bot.telegram.sendMessage(DEV_ID, `CHAT ID: *${ctx.message.text}*\n${listReminders(inputId)}`, {parse_mode: 'Markdown'});
				devcheck = 0;
			} else {
				devcheck = 4;
				bot.telegram.sendMessage(DEV_ID, `Unable to find chat ID. Try again or /canceldev.`);
			}
		}else {
			devcheck = 4;
			bot.telegram.sendMessage(DEV_ID, `Send me the target User/Group Chat ID, or /canceldev to cancel.`);
		}
	}
});

bot.command('dev_listchats', (ctx) => {
	if (ctx.message.from.id == DEV_ID) {
		devcommands.listChats();
	}
});

bot.command('dev_startbot', async (ctx) => {
	if (ctx.message.from.id == DEV_ID) {
		var targetId = ctx.message.text.replace(`/dev_startbot`,``).trim();;
		try {
			var targetChat = await bot.telegram.getChat(targetId);
			bot.telegram.sendMessage(DEV_ID, `Starting bot for ${targetId}...`);
			console.log(targetChat);
			startBot(targetChat, 'norm');
		} catch(err) {
			bot.telegram.sendMessage(DEV_ID, err)
			console.log(`"${err}" on dev_startbot.`)
			bot.telegram.sendMessage(DEV_ID, `Please input a valid Chat ID.`);
		}
	}
});

bot.command('dev_startbotinvis', async (ctx) => {
	if (ctx.message.from.id == DEV_ID) {
		var targetId = ctx.message.text.replace(`/dev_startbotinvis`,``).trim();
		try {
			var targetChat = await bot.telegram.getChat(targetId);
			bot.telegram.sendMessage(DEV_ID, `Starting bot for ${targetId}...`);
			console.log(targetChat);
			startBot(targetChat, 'invis');
		} catch(err) {
			bot.telegram.sendMessage(DEV_ID, err)
			console.log(`"${err}" on dev_startbotinvis.`)
			bot.telegram.sendMessage(DEV_ID, `Please input a valid Chat ID.`);
		}
	}
});

bot.command('dev_announceusers', (ctx) => {
	if (ctx.message.from.id == DEV_ID && devcheck == 0) {
		devcheck = 5;
		bot.telegram.sendMessage(DEV_ID, `Type the announcement now, or /canceldev to cancel.`)
	}
});

// Bot Commands
bot.help((ctx) => ctx.replyWithMarkdown('*/starttempusu* to start Tempusu Bot reminders. */commands* to see the full list of commands.'));
bot.command('about', (ctx) => ctx.replyWithMarkdown(`Customisable temperature-taking reminders for this Covid-19 season! Made for Tembusu College by Tan Yi Jia. (Version 2.2)`));
// bot.command('time', (ctx) => ctx.replyWithMarkdown(`The current time is *${helper.currentTime('time')}* in Singapore, GMT+8.`));
bot.command('website', (ctx) => ctx.replyWithMarkdown(`Declare your temperature [HERE](https://myaces.nus.edu.sg/htd/htd).`));
bot.command('commands', (ctx) => {
	ctx.replyWithMarkdown(`
	*Commands List:*
	*/starttempusu* - Start the temperature reminders!
	*/help* - What can I do?
	*/commands* - List of available commands.
	*/about* - About Tempusu Bot.
	*/website* - Get the link for the temperature declaration website.
	*/nextreminder* - Find out when the next reminder will be fired.
	*/reminderlist* - List all stored reminders.
	*/addreminder* - Add a new reminder
	*/removereminder* - Remove a reminder.
	*/removeall* - Remove all reminders.
	*/status* - Check whether reminders are active.
	*/stop* - Stop the temperature reminders.
	*/reset* - Reset the bot.
	*/done* - Let the bot know you've taken your temperature and pause AM/PM reminders accordingly.
	*/undone* - Undo the done command in case you made a mistake.
	*/feedback* - Report a bug, suggest a feature, or drop a message for my creator!
	`);
});

bot.start((ctx) => {
	startBot(ctx.chat, 'norm');
});

bot.command('starttempusu', (ctx) => {
	startBot(ctx.chat, 'norm');
});

bot.command('status', (ctx) => {
	if (startcheck[ctx.chat.id] == 1){
		ctx.replyWithMarkdown(`Tempusu Bot is running!`)
	} else {
		ctx.replyWithMarkdown(`Tempusu Bot is not running. */starttempusu* to begin.`)
	};
});

bot.command('stop', (ctx) => {
	if (startcheck[ctx.chat.id] == 1){
		if (editcheck[ctx.chat.id] == 0) {
			ctx.replyWithMarkdown(`*${reminder[ctx.chat.id].length}* Reminders stopped.`);
			startcheck[ctx.chat.id] = 0;
			stopReminders(ctx.chat);
			groupRun--;
			console.log(`Bot running for ${groupRun} chat(s).`);
		} else {
			ctx.replyWithMarkdown(`Another edit is being made. Complete it first or */cancel* to cancel it.`);
			console.log(editcheck[ctx.chat.id]);
		}
	} else {
		ctx.replyWithMarkdown(`Tempusu Bot is not running. */starttempusu* to begin.`)
	};
});

bot.command('nextreminder', (ctx) => {
	if (startcheck[ctx.chat.id] == 1) {
		var reminderCount = reminder[ctx.chat.id].length;
		if (reminderCount > 0) {
			var t = helper.currentTime('value');
			var reminded = 0;
			if (t > reminder[ctx.chat.id][reminderCount-1].time || (t>=12 && done[ctx.chat.id] == true)) {
				ctx.replyWithMarkdown(`The next reminder will be at *${helper.getTime(reminder[ctx.chat.id][0].time,'time')}*.`)
			} else {
				for (i=0;i<reminderCount;i++) {
					if (t < reminder[ctx.chat.id][i].time && reminded == 0) {
						if (done[ctx.chat.id] != 1 || reminder[ctx.chat.id][i].time>=12) {
							ctx.replyWithMarkdown(`The next reminder will be at *${helper.getTime(reminder[ctx.chat.id][i].time,'time')}*.`);
							reminded = 1;
						}
					}
				}
			}
		} else {
			ctx.replyWithMarkdown(`No reminders set. */addreminder* to set a new one.`);
		}
	} else {
		ctx.replyWithMarkdown(`Tempusu Bot is not running. */starttempusu* to begin.`);
	};
});

bot.command('reminderlist', (ctx) => {
	if (initialisecheck[ctx.chat.id] != 1){
		ctx.replyWithMarkdown(`Tempusu Bot has not been initialised. */starttempusu* to begin.`)
	} else {
		ctx.replyWithMarkdown(listReminders(ctx.chat.id));
	};
});


// Reminder Creation, Removal, and Reset commands

bot.command('addreminder', (ctx) => {
	if (initialisecheck[ctx.chat.id] != 1) {
		ctx.replyWithMarkdown(`Tempusu Bot has not been initialised. */starttempusu* to begin.`)
	} else if (reminder[ctx.chat.id].length > 20) {
		ctx.replyWithMarkdown(`*Whoa there, no more than 20 reminders!!!*`)
	} else if (editcheck[ctx.chat.id] == 0) {
		var input = ctx.message.text.replace(`/addreminder`,``).trim();
		if (input != '' && input != '@TempusuBot') {
			var reminderCount = reminder[ctx.chat.id].length;
			if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(input)) {
				var timeValue = input.replace(`:`,`.`);
				if (checkTime(ctx.chat, timeValue) == true) {
					createReminder(ctx.chat, timeValue, reminderCount);
					ctx.replyWithMarkdown(`Reminder added at *${helper.getTime(timeValue,'time')}*`);
					editcheck[ctx.chat.id] = 0;
				} else {
					ctx.replyWithMarkdown(`Reminder already exists at this timing. Indicate another timing or */cancel* to cancel.`);
				}
			} else if (/^([0-1]?[0-9]|2[0-3])[0-5][0-9]$/.test(input)) {
				var timeValue = input/100;
				if (checkTime(ctx.chat, timeValue) == true) {
					createReminder(ctx.chat, timeValue, reminderCount);
					ctx.replyWithMarkdown(`Reminder added at *${helper.getTime(timeValue,'time')}*`);
					editcheck[ctx.chat.id] = 0;
				} else {
					ctx.replyWithMarkdown(`Reminder already exists at this timing. Indicate another timing or */cancel* to cancel.`);
				}
			} else {
				ctx.replyWithMarkdown(`Please enter a valid time *(hhmm / hh:mm)* or */cancel* to cancel.`);
				editcheck[ctx.chat.id] = 1;
				edituser[ctx.chat.id] = ctx.message.from.id;
			}
		} else {
			ctx.replyWithMarkdown(`Enter your desired reminder timing *"hhmm" or "hh:mm"* in the *24-hour format* _(Example: 15:30 is 3:30pm)_.\n*/cancel* to cancel.`)
			editcheck[ctx.chat.id] = 1;
			edituser[ctx.chat.id] = ctx.message.from.id;
		}
	} else {
		ctx.replyWithMarkdown(`Another edit is being made. Complete it first or */cancel* to cancel it.`);
	};
});

bot.command('removereminder', (ctx) => {
	if (initialisecheck[ctx.chat.id] != 1) {
		ctx.replyWithMarkdown(`Tempusu Bot has not been initialised. */starttempusu* to begin.`)
	} else if (editcheck[ctx.chat.id] == 0) {
		ctx.replyWithMarkdown(`${listReminders(ctx.chat.id)}\nEnter the corresponding *reminder ID* to remove.\n*/cancel* to cancel.`)
		editcheck[ctx.chat.id] = 2;
		edituser[ctx.chat.id] = ctx.message.from.id;
	} else {
		ctx.replyWithMarkdown(`Another edit is being made. Complete it first or */cancel* to cancel it.`);
	};
});

bot.command('reset', (ctx) => {
	if (initialisecheck[ctx.chat.id] != 1) {
		ctx.replyWithMarkdown(`Tempusu Bot has not been initialised. */starttempusu* to begin.`);
	} else if (editcheck[ctx.chat.id] == 0) {
		ctx.replyWithMarkdown(`Are you sure? *THIS ACTION CANNOT BE UNDONE.*\n*/confirmreset* to confirm.\n*/cancel* to cancel.`);
		editcheck[ctx.chat.id] = 3;
		edituser[ctx.chat.id] = ctx.message.from.id;
	} else {
		ctx.replyWithMarkdown(`Another edit is being made. Complete it first or */cancel* to cancel it.`);
	};
});

bot.command('removeall', (ctx) => {
	if (initialisecheck[ctx.chat.id] != 1) {
		ctx.replyWithMarkdown(`Tempusu Bot has not been initialised. */starttempusu* to begin.`);
	} else if (editcheck[ctx.chat.id] != 0) {
		ctx.replyWithMarkdown(`Another edit is being made. Complete it first or */cancel* to cancel it.`);
	} else {
		ctx.replyWithMarkdown(`Are you sure? *THIS ACTION CANNOT BE UNDONE.*\n*/confirm* to confirm.\n*/cancel* to cancel.`)
		editcheck[ctx.chat.id] = 4;
		edituser[ctx.chat.id] = ctx.message.from.id;
	}
});

bot.command('feedback', (ctx) => {
	if (initialisecheck[ctx.chat.id] != 1) {
		ctx.replyWithMarkdown(`Tempusu Bot has not been initialised. */starttempusu* to begin.`);
	} else if (editcheck[ctx.chat.id] != 0) {
		ctx.replyWithMarkdown(`Another edit is being made. Complete it first or */cancel* to cancel it.`);
	} else {
		ctx.replyWithMarkdown(`Send me your feedback/bug report, or */cancel* to cancel.`)
		editcheck[ctx.chat.id] = 5;
		edituser[ctx.chat.id] = ctx.message.from.id;
	}
});

// 'DONE' FUNCTION
bot.command('done', (ctx) => {
	if (initialisecheck[ctx.chat.id] != 1) {
		ctx.replyWithMarkdown(`Tempusu Bot has not been initialised. */starttempusu* to begin.`)
	} else {
		var t = helper.currentTime('value');
		if (done[ctx.chat.id] != 1) {
			done[ctx.chat.id] = 1;
			pool.getConnection(function(err, connection) {
				connection.query(`UPDATE TempusuChats SET done = '1' WHERE chat_id = '${ctx.chat.id}'`);
				connection.release();
			});
			if (t<12) {
				ctx.replyWithMarkdown(`*AM* temperature taken! */undone* to undo.`);
			} else {
				ctx.replyWithMarkdown(`*PM* temperature taken! */undone* to undo.`);
			}
		} else {
			if (t<12) {
				ctx.replyWithMarkdown(`*AM* temperature already taken.`);
			} else {
				ctx.replyWithMarkdown(`*PM* temperature already taken.`);
			}
		}
	};
});

bot.command('undone', (ctx) => {
	if (initialisecheck[ctx.chat.id] != 1) {
		ctx.replyWithMarkdown(`Tempusu Bot has not been initialised. */starttempusu* to begin.`)
	} else {
		var t = helper.currentTime('value');
		if (done[ctx.chat.id] == 1) {
			done[ctx.chat.id] = 0;
			pool.getConnection(function(err, connection) {
				connection.query(`UPDATE TempusuChats SET done = '0' WHERE chat_id = '${ctx.chat.id}'`);
				connection.release();
			});
			if (t<12) {
				ctx.replyWithMarkdown(`*AM* reminders resumed.`);
			} else {
				ctx.replyWithMarkdown(`*PM* reminders resumed.`);
			}
		} else {
			if (t<12) {
				ctx.replyWithMarkdown(`*AM* temperature not yet taken.`);
			} else {
				ctx.replyWithMarkdown(`*PM* temperature not yet taken.`);
			}
		}
	};
});

bot.on('message', (ctx) => {
	if (editcheck[ctx.chat.id] == 1) { // After the addreminder command
		if (ctx.message.text == "/cancel" || ctx.message.text == "/cancel@TempusuBot") {
			ctx.replyWithMarkdown(`Reminder creation cancelled.`);
			editcheck[ctx.chat.id] = 0;
		} else if (edituser[ctx.chat.id] == ctx.message.from.id) {
			var reminderCount = reminder[ctx.chat.id].length;
			if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(ctx.message.text)) {
				var timeValue = ctx.message.text.replace(`:`,`.`);
				if (checkTime(ctx.chat, timeValue) == true) {
					createReminder(ctx.chat, timeValue, reminderCount);
					ctx.replyWithMarkdown(`Reminder added at *${helper.getTime(timeValue,'time')}*`);
					editcheck[ctx.chat.id] = 0;
				} else {
					ctx.replyWithMarkdown(`Reminder already exists at this timing. Indicate another timing or */cancel* to cancel.`);
				}
			} else if (/^([0-1]?[0-9]|2[0-3])[0-5][0-9]$/.test(ctx.message.text)) {
				var timeValue = (ctx.message.text)/100;
				if (checkTime(ctx.chat, timeValue) == true) {
					createReminder(ctx.chat, timeValue, reminderCount);
					ctx.replyWithMarkdown(`Reminder added at *${helper.getTime(timeValue,'time')}*`);
					editcheck[ctx.chat.id] = 0;
				} else {
					ctx.replyWithMarkdown(`Reminder already exists at this timing. Indicate another timing or */cancel* to cancel.`);
				}
			} else {
				ctx.replyWithMarkdown(`Please enter a valid time *(hhmm / hh:mm)* or */cancel* to cancel.`);
			}
		}
	} else if (editcheck[ctx.chat.id] == 2) { // After the removereminder command
		if (ctx.message.text == "/cancel" || ctx.message.text == "/cancel@TempusuBot") {
			ctx.replyWithMarkdown(`Reminder removal cancelled.`);
			editcheck[ctx.chat.id] = 0;
		} else if (edituser[ctx.chat.id] == ctx.message.from.id) {
			var inputId = ctx.message.text;
			if (!isNaN(inputId) && reminder[ctx.chat.id][inputId-1] != null) {
				removeReminder(ctx.chat, inputId-1);
				editcheck[ctx.chat.id] = 0;
			} else {
				ctx.replyWithMarkdown(`Unable to find corresponding reminder ID. */cancel* to cancel.`);
			}
		}
	} else if (editcheck[ctx.chat.id] == 3) { // After the reset reminder command
		if (ctx.message.text == "/cancel" || ctx.message.text == "/cancel@TempusuBot") {
			ctx.replyWithMarkdown(`Reset cancelled.`);
			editcheck[ctx.chat.id] = 0;
		} else if (edituser[ctx.chat.id] == ctx.message.from.id) {
			if (ctx.message.text == "/confirmreset" || ctx.message.text == "/confirmreset@TempusuBot") {
				purgeChat(ctx.chat, "reset");
				editcheck[ctx.chat.id] = 0;
				ctx.replyWithMarkdown(`Tempusu Bot has been reset. */starttempusu* to restart the bot.`);
			}
		}
	} else if (editcheck[ctx.chat.id] == 4) { // After the Removeall command
		if (ctx.message.text == "/cancel" || ctx.message.text == "/cancel@TempusuBot") {
			ctx.replyWithMarkdown(`Remove all reminders cancelled.`);
			editcheck[ctx.chat.id] = 0;
		} else if (edituser[ctx.chat.id] == ctx.message.from.id) {
			if (ctx.message.text == "/confirm" || ctx.message.text == "/confirm@TempusuBot") {
				removeAll(ctx.chat);
				editcheck[ctx.chat.id] = 0;
				ctx.replyWithMarkdown(`All reminders removed.`);
			}
		}
	} else if (editcheck[ctx.chat.id] == 5) { // AFter the Feedback Command
		if (ctx.message.text == "/cancel" || ctx.message.text == "/cancel@TempusuBot") {
			ctx.replyWithMarkdown(`Feedback cancelled.`);
			editcheck[ctx.chat.id] = 0;
		} else if (edituser[ctx.chat.id] == ctx.message.from.id) {
			bot.telegram.sendMessage(DEV_ID, `Feedback from ${ctx.message.from.username} (${ctx.message.from.id}): "${ctx.message.text}"`);
			ctx.replyWithMarkdown(`Your feedback has been sent to my creator. Thank you! :)`);
			editcheck[ctx.chat.id] = 0;
		}
	}

	if (ctx.message.from.id == DEV_ID) { //Announce All Message
		if (devcheck == 1) {
			if (ctx.message.text == "/canceldev" || ctx.message.text == "/canceldev@TempusuBot") {
				bot.telegram.sendMessage(DEV_ID, `Announcement cancelled.`)
				devcheck = 0;
			} else {
				devcommands.announceAll(ctx);
				devcheck = 0;
			}
		} else if (devcheck == 2) {  // Announce One Enter ID
			if (ctx.message.text == "/canceldev" || ctx.message.text == "/canceldev@TempusuBot") {
				bot.telegram.sendMessage(DEV_ID, `Announcement cancelled.`);
				devcheck = 0;
			} else if (devcommands.checkChats(ctx.message.text) == true) {
				AOStore = ctx.message.text;
				bot.telegram.sendMessage(DEV_ID, `Send me the announcement for ${AOStore}.`)
				devcheck = 3;
			} else if (ctx.message.text.includes("/persist")) {
				AOStore = ctx.message.text.replace(`/persist`,``).trim();;
				bot.telegram.sendMessage(DEV_ID, `Persisting. Send me the announcement for ${AOStore}.`)
				devcheck = 3;
			} else {
				bot.telegram.sendMessage(DEV_ID, `Unable to find chat ID. Try again or /canceldev. Otherwise, /persist ID-HERE.`);
			}
		} else if (devcheck == 3) { // Announce One Message
			if (ctx.message.text == "/canceldev" || ctx.message.text == "/canceldev@TempusuBot") {
				bot.telegram.sendMessage(DEV_ID, `Announcement cancelled.`);
				devcheck = 0;
			} else {
				devcommands.announceOne(AOStore, ctx);
				devcheck = 0;
			}
		} else if (devcheck == 4) { // List target chat's reminders
			if (ctx.message.text == "/canceldev" || ctx.message.text == "/canceldev@TempusuBot") {
				bot.telegram.sendMessage(DEV_ID, `List check cancelled.`);
				devcheck = 0;
			} else if (devcommands.checkChats(ctx.message.text) == true) {
				bot.telegram.sendMessage(DEV_ID, `CHAT ID: *${ctx.message.text}*\n${listReminders(ctx.message.text)}`, {parse_mode: 'Markdown'});
				devcheck = 0;
			} else {
				bot.telegram.sendMessage(DEV_ID, `Unable to find chat ID. Try again or /canceldev.`);
			}
		} else if (devcheck == 5) { // Announce All Users Message
			if (ctx.message.text == "/canceldev" || ctx.message.text == "/canceldev@TempusuBot") {
				bot.telegram.sendMessage(DEV_ID, `Announcement cancelled.`)
				devcheck = 0;
			} else {
				devcommands.announceUsers(ctx);
				devcheck = 0;
			}
		}
	}
});


// Helper Functions

startBot = (chat, req) => {
	if (startcheck[chat.id] == 1){
		bot.telegram.sendMessage(chat.id, `Tempusu Bot already started.`, {parse_mode: 'Markdown'})
	} else {
		pool.getConnection(function(err, connection) {
			if (initialisecheck[chat.id] != 1) {
				devcommands.addChat(chat, 'norm');
				connection.query(`SELECT * FROM TempusuChats WHERE chat_id = '${chat.id}'`, function (err, result) {
					if (result && result.length) {
						console.log(`${chat.id} already in database!`)
						connection.query(`UPDATE TempusuChats SET initialised = '1' WHERE chat_id = '${chat.id}'`);
					} else {
						connection.query(`INSERT INTO TempusuChats (chat_id) VALUES (${chat.id})`);
						console.log(`${chat.id} added to database.`)
					};
				});
				groupNum++;
				reminder[chat.id] = [];
				createReminder(chat, 10.00, 0); // Default 10:00 AM Reminder
				createReminder(chat, 18.00, 1); // Default 6:00 PM Reminder
				initialisecheck[chat.id] = 1;
				editcheck[chat.id] = 0;
				edituser[chat.id] = 0;
				if (chat.title != undefined) {
					console.log(`Bot initialised for Group: ${chat.title}, Chat ID: ${chat.id} with ${reminder[chat.id].length} reminders.`)
				}
				else {
					console.log(`Bot initialised for User: ${chat.username}, Chat ID: ${chat.id} with ${reminder[chat.id].length} reminders.`)
				}
				console.log(`Bot initialised for ${groupNum} group(s).`);
			} else {startReminders(chat)};
			
			startcheck[chat.id] = 1;

			connection.query(`UPDATE TempusuChats SET running = '1' WHERE chat_id = '${chat.id}'`, function(err, result) {
				groupRun++;
				console.log(`Bot running for ${groupRun} chat(s).`)
				console.log(`Tempusu Bot started for ${chat.id} with ${reminder[chat.id].length} reminders.`);
				if (req == 'norm') {
					bot.telegram.sendMessage(chat.id, `Tempusu Bot Started with *${reminder[chat.id].length}* reminders!`, {parse_mode: 'Markdown'})
				}
			});
			connection.release();
		});
	};
};

createReminder = (chat, timeValue, rID) => {
	var timeString = helper.getTime(timeValue,'schedule')
	var sqlID;
	reminder[chat.id][rID] = {
		time : timeValue,
		timeString : timeString,
		schedule: schedule.scheduleJob(timeString, function(){tempRemind(chat)}),
	}
	pool.getConnection(function(err, connection) {
		connection.query(`INSERT INTO TempusuData (chat_id, time, timeString) VALUES ('${chat.id}', '${reminder[chat.id][rID].time}', '${reminder[chat.id][rID].timeString}')`, function (err, result) {
			sqlID = result.insertId;
			console.log(`Reminder for ${chat.id} with ID ${sqlID} created for ${helper.getTime(reminder[chat.id][rID].time,'time')} at ${helper.currentTime('time')}`);
			reminder[chat.id][rID].id = sqlID;
			sortReminders(chat.id);
			connection.release();
		});
	});
};

removeReminder = (chat, rID) => {
	bot.telegram.sendMessage(chat.id, `Reminder *${rID+1}* at *${helper.getTime(reminder[chat.id][rID].time, 'time')}* removed.`, {parse_mode: 'Markdown'})
	console.log(`Reminder for ${chat.id} with ID ${reminder[chat.id][rID].id} and time ${helper.getTime(reminder[chat.id][rID].time,'time')} removed at ${helper.currentTime('time')}.`);
	var delID = reminder[chat.id][rID].id;
	pool.getConnection(function(err, connection) {
		connection.query(`DELETE FROM TempusuData WHERE id = '${delID}'`, function(err, result) {
			console.log(`Removed reminder from database for ${chat.id}.`);
			connection.release();
		});
	});
	reminder[chat.id].splice(rID,1);
	sortReminders(chat.id);
};

removeAll = (chat) => {
	reminder[chat.id].splice(0);
	pool.getConnection(function(err, connection) {
		connection.query(`DELETE FROM TempusuData WHERE chat_id = '${chat.id}'`, function(err, result) {
			console.log(`Removed all reminders from database for ${chat.id}.`)
			connection.release();
		});
	});
}

sortReminders = (chatid) => {
	reminder[chatid].sort(function(a, b){
		return a.time - b.time;
	});
};

listReminders = (chatid) => {
	var reminderCount = reminder[chatid].length;
	var list = `*You have ${reminderCount} Reminders:*\n`
	for (i=0;i<reminderCount;i++) {
		list += `*${i+1}*: ${helper.getTime(reminder[chatid][i].time,'time')}\n`
	}
	return list;
};

stopReminders = (chat) => {
	var reminderCount = reminder[chat.id].length;
	console.log(`${reminderCount} Reminders stopped for ${chat.id}.`);
	for (i=0;i<reminderCount;i++) {
		if (reminder[chat.id][i].schedule != null) {
			reminder[chat.id][i].schedule.cancel()
		};
	};
	pool.getConnection(function(err, connection) {
		connection.query(`UPDATE TempusuChats SET running = '0' WHERE chat_id = '${chat.id}'`);
		connection.release();
	});
};

startReminders = (chat) => {
	var reminderCount = reminder[chat.id].length;
	console.log(`${reminderCount} Reminders started.`);
	for (i=0;i<reminderCount;i++) {
		if (reminder[chat.id][i].schedule != null) {
			reminder[chat.id][i].schedule.reschedule(reminder[chat.id][i].timeString);
		};
	};
	pool.getConnection(function(err, connection) {
		connection.query(`UPDATE TempusuChats SET running = '1' WHERE chat_id = '${chat.id}'`);
		connection.release();
	});
};

tempRemind = (chat) => {
	var reminderCount = reminder[chat.id].length;
	var t = helper.currentTime('value');
	for (i=0;i<reminderCount;i++) {
		if (t == reminder[chat.id][i].time && done[chat.id] != 1) {
			try {
				bot.telegram.sendMessage(chat.id,
					`*${helper.getTimeLeft(t)} Left!*\n\nRemember to take your *${helper.getTime(t,'ampm')}* temperature!\n[*DECLARE TEMPERATURE HERE*](https://myaces.nus.edu.sg/htd/htd)\n\n*/done* if declared.`,
					{parse_mode: 'Markdown'}).then(function(resp) {
				}).catch(function(error) {
					if (error == "Error: 403: Forbidden: bot was kicked from the group chat" || error == "Error: 403: Forbidden: bot was blocked by the user") {
						purgeChat(chat, error);
					} else {
						console.log(`Error for ${chat.id}! `+error);
					}
				})
			} catch (err) {
				if (chat.title != undefined) {
					console.log(`"${err}" when trying to send to Group: ${chat.title}, Chat ID: ${chat.id}."`);
					bot.telegram.sendMessage(DEV_ID, `Error "${err}" when trying to send to Group: ${chat.title}, Chat ID: ${chat.id}.`)
				} else {
					console.log(`"${err}" when trying to send to User: ${chat.username}, Chat ID: ${chat.id}."`);
					bot.telegram.sendMessage(DEV_ID, `Error "${err}" when trying to send to User: ${chat.username}, Chat ID: ${chat.id}.`)
				}				
			}
		}
	}
};

checkTime = (chat, timeValue) => {
	for (i=0;i<reminder[chat.id].length;i++) {
		if (reminder[chat.id][i].time == timeValue){
			return false;
		}
	}
	return true;
}

// DONE FUNCTIONS
resetDone = () => {
	done = [];
	pool.getConnection(function(err, connection) {
		connection.query(`UPDATE TempusuChats SET done = '0'`);
		connection.release();
	});
	console.log("Reset Done status for all!");
}

var resetNoon = schedule.scheduleJob('59 59 03 * * *', resetDone);
var resetMidnight = schedule.scheduleJob('59 59 15 * * *', resetDone);

// INITIALISING THE SYSTEM
var TempusuChats;
var TempusuData;

retrieveSQL = () => {
	pool.getConnection(function(err, connection) {
		bot.telegram.sendMessage(DEV_ID, `Bot system starting up...`);
		console.log(`Bot system starting up...`);
		const chatPromise = new Promise((resolve, reject) => {
			connection.query(`SELECT * FROM TempusuChats`, function (err, result) {
				TempusuChats = result;
				resolve(`Retrieved ${TempusuChats.length} TempusuChats!`)
			});
		})
		const dataPromise = new Promise((resolve, reject) => {
			connection.query(`SELECT * FROM TempusuData`, function (err, result) {
				TempusuData = result;
				resolve(`Retrieved ${TempusuData.length} TempusuData!`)
			});
		})
		Promise.all([chatPromise, dataPromise]).then((messages) => {
			connection.release();
			console.log(messages);
			initSystem();
		})
	})
};

initSystem = async () => {
	console.log (`Initialising...`);
	var i = 0;
	while (i<TempusuChats.length) {
		console.log(`Running initialisation iteration ${i}.`)
		var chatid = TempusuChats[i].chat_id;
		var chat = 0;
		reminder[chatid] = [];
		startcheck[chatid] = TempusuChats[i].running;
		initialisecheck[chatid] = TempusuChats[i].initialised;
		editcheck[chatid] = 0;
		done[chatid] = TempusuChats[i].done;
		try {
			chat = await bot.telegram.getChat(chatid);
			initReminder(chat);
		} catch(err) {
			console.log(`${err}. ID: ${chatid}. Removing chat from database.`)
			pool.getConnection(function(err, connection) {
				connection.query(`DELETE FROM TempusuChats WHERE chat_id = '${chat.id}'`);
				connection.query(`DELETE FROM TempusuData WHERE chat_id = '${chat.id}'`);
				connection.release();
			});
		}
		i++;
	};
	bot.telegram.sendMessage(DEV_ID, `Initialisation Finished!`);
}

initReminder = (chat) => {
	var n = 0;
	for (i=0;i<TempusuData.length;i++) {
		if (TempusuData[i].chat_id == chat.id) {
			reminder[chat.id][n] = {
				id : TempusuData[i].id,
				time : TempusuData[i].time,
				timeString : TempusuData[i].timeString,
				schedule : schedule.scheduleJob(TempusuData[i].timeString, function () { tempRemind(chat); }),
			}
			n++;
		}
	}
	console.log(`${n} Reminders retrieved for ${chat.id}.`);
	sortReminders(chat.id);
	devcommands.addChat(chat, 'silent');
	if (startcheck[chat.id] == 1) {
		groupRun++;
	} else if (reminder[chat.id].length > 0) {
		stopReminders(chat);
	}
}

purgeChat = (chat, error) => {
	if (error == "reset") {
		console.log(`${chat.id} Has reset their Tempusu Bot.`);
	} else {
		console.log(`${error} for ID: ${chat.id}. Removing chat from database.`)
	}
	groupNum--;
	if (startcheck[chat.id] == 1) {
		groupRun--;
	}
	reminder[chat.id].splice(0);
	// initialisecheck.splice(initialisecheck.indexOf(chat.id), 1);
	// startcheck.splice(startcheck.indexOf(chat.id), 1);
	// editcheck.splice(editcheck.indexOf(chat.id), 1);
	// edituser.splice(edituser.indexOf(chat.id), 1);
	initialisecheck[chat.id] = 0;
	startcheck[chat.id] = 0;
	editcheck[chat.id] = 0;
	console.log(`Purged reminders and reset checks for ${chat.id}.`);
	devcommands.removeChat(chat);
	pool.getConnection(function(err, connection) {
		connection.query(`DELETE FROM TempusuChats WHERE chat_id = '${chat.id}'`);
		connection.query(`DELETE FROM TempusuData WHERE chat_id = '${chat.id}'`);
		connection.release();
		bot.telegram.sendMessage(DEV_ID, `Removed ${chat.id} from database.`);
		console.log(`Bot running for ${groupRun} chat(s).`);
		console.log(`Bot initialised for ${groupNum} chat(s).`);
	});
}

module.exports.purgeChat = (chat, error) => {
	purgeChat(chat, error);
}

retrieveSQL();

bot.launch();
