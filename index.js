require('dotenv').config(); // npm i dotenv

const { Client, GatewayIntentBits, ActivityType, ChannelType } = require('discord.js');
const { AudioPlayer, createAudioResource, StreamType, joinVoiceChannel, createAudioPlayer, AudioPlayerStatus, getVoiceConnection } = require("@discordjs/voice");
const ytdl = require("@distube/ytdl-core");
const ytpl = require('ytpl');
const discordTTS = require("discord-tts");
const ffmpeg = require('ffmpeg-static');
const NewsAPI = require('newsapi');
const newsapi = new NewsAPI(process.env.newsapikey);

let player = createAudioPlayer();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setPresence({
    activities: [{ name: `Powered by BotVision`, type: ActivityType.Listening }],
    status: 'online',
  });

  client.guilds.cache.forEach(async (guild) => {
    guild.channels.cache.forEach(async (channel) => {
      if (channel.name.toLowerCase().includes("radio")) {
        await connectToChannel(channel);
      }
    });
  });

  queue();
});

async function connectToChannel(channel) {
  console.log(`Connecting to channel: ${channel.name}`);
  try {
    const connection = await joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
      const newUdp = Reflect.get(newNetworkState, 'udp');
      clearInterval(newUdp?.keepAliveInterval);
    };

    connection.on('stateChange', (oldState, newState) => {
      Reflect.get(oldState, 'networking')?.off('stateChange', networkStateChangeHandler);
      Reflect.get(newState, 'networking')?.on('stateChange', networkStateChangeHandler);
    });

    connection.subscribe(player);
    console.log('Successfully connected and subscribed to the channel');
  } catch (error) {
    console.error('Error connecting to channel:', error);
  }
}

function start() {
  console.log('Starting radio...');
  player = createAudioPlayer();
  client.guilds.cache.forEach(async (guild) => {
    guild.channels.cache.forEach(async (channel) => {
      if (channel.name.toLowerCase().includes("radio")) {
        const connection = getVoiceConnection(guild.id);
        if (connection) {
          connection.subscribe(player);
        }
      }
    });
  });

  const todaysDate = new Date();
  const formattedDate = `${todaysDate.getFullYear()}-${String(todaysDate.getMonth() + 1).padStart(2, '0')}-${String(todaysDate.getDate()).padStart(2, '0')}`;

  newsapi.v2.topHeadlines({
    sources: 'bbc-news,the-verge,abc-news,al-jazeera-english,ars-technica,cnn',
    from: formattedDate,
    to: formattedDate,
    language: process.env.language,
    page: 1
  }).then(async response => {
    if (response.status !== "ok" || !response.articles || response.articles.length === 0) {
      console.log('No articles found in response');
      return;
    }

    const playlist = await ytpl(process.env.ytplaylist);
    const nextSong = getNextSong(playlist.items);
    const newsItem = getRandomElement(response.articles);

    get(newsItem, nextSong.title, nextSong.shortUrl);
  });

  playInitialMessage();
}

function playInitialMessage() {
  const initialMessage = "Welcome to the first AI Radio. Give us a second while we start everything up...";
  console.log('Playing initial message...');
  playTextToSpeech(initialMessage);
}

function getNextSong(items) {
  const randomItem = getRandomElement(items);
  return {
    title: randomItem.title.replace(/\[.*?\]|\(.*?\)/g, '').replace('-', 'with').trim(),
    shortUrl: randomItem.shortUrl
  };
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function get(newsItem, nextSong, url) {
  const todaysDate = new Date();
const time = todaysDate.getHours()

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINIKEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const msg = `Imagine you are an AI DJ in an online radio station (in language ${process.env.language}). Write it like this message is after a song. You should talk something about ${newsItem.title} now. Write it as if it could be broadcast directly, don't invent anything. Data: ${newsItem.description}. Then say that the song ${nextSong} you will play next. you may be creative to hype the viewers up, but dont overdo it. Time hour: ${time}`;

  const result = await model.generateContent(msg);
  const text = result.response.text();

  console.log('Generated text:', text);
  playAudio(url, text);
}

async function playAudio(link, message) {
  console.log('Playing audio message and song...');
  const messageParts = splitString(message);
  playTextToSpeech(messageParts.shift());

  player.on(AudioPlayerStatus.Idle, () => {
    if (messageParts.length === 0) {
      player.removeAllListeners();
      playSong(link);
    } else {
      playTextToSpeech(messageParts.shift());
    }
  });
}

function playTextToSpeech(text) {
  const stream = discordTTS.getVoiceStream(text);
  const audioResource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
  player.play(audioResource);
}

function playSong(link) {
  console.log('Playing song:', link);
  const stream = ytdl(link, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
  const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });

  player.play(resource);

  player.on(AudioPlayerStatus.Idle, () => {
    queue();
  });
}


async function queue() {
  const userCount = await connectedUsers();
  if (userCount > 0) {
    setTimeout(start, 1000);
  } else {
    setTimeout(queue, 1000);
  }
}

async function connectedUsers() {
  let userCount = 0;
  let guilds = new Set();

  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (channel.name.toLowerCase().includes("radio")) {
        if (!guilds.has(guild.id)) {
          guilds.add(guild.id);
          userCount += channel.members.size;
        }
      }
    }
  }

  return userCount - guilds.size;
}

client.on("guildCreate", async (guild) => {
  let defaultChannel = guild.channels.cache.find(channel => channel.type === ChannelType.GuildText);
  if (defaultChannel) {
    defaultChannel.send("Thank you for adding the AI-Powered Radio. I have created a channel for you, **if you already have one, delete it. You can never have duplicates with the name 'radio' in it!**");
  }

  const channel = await guild.channels.create({
    name: "radio",
    type: ChannelType.GuildVoice,
    parent: null,
  });

  await connectToChannel(channel);
});

function splitString(str) {
  const arr = [];
  while (str.length > 0) {
    let substr = str.substring(0, 200);
    if (substr.length === 200) {
      substr = substr.substring(0, Math.min(substr.length, substr.lastIndexOf(" ")));
    }
    arr.push(substr);
    str = str.substring(substr.length).trim(); // Corrected line
  }
  return arr;
}


client.login(process.env.discordtoken);
