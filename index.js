require('dotenv').config(); // npm i dotenv

const { Client, GatewayIntentBits, ActivityType, ChannelType } = require('discord.js');
const { AudioPlayer, createAudioResource, StreamType, joinVoiceChannel, createAudioPlayer, AudioPlayerStatus, getVoiceConnection } = require("@discordjs/voice");
const ytdl = require("@distube/ytdl-core");
const ytpl = require('ytpl');
const discordTTS = require("discord-tts");
const NewsAPI = require('newsapi');
const newsapi = new NewsAPI(process.env.newsapikey);


let premiumVoice = true

let dataradio = process.env.dataradio

const ElevenLabs = require('elevenlabs-node');
let voice = undefined
if(process.env.ELEVEN_LABS_API_KEY){
  voice = new ElevenLabs({
    apiKey: process.env.ELEVEN_LABS_API_KEY, // Your Eleven Labs API key
  });
}else{
  premiumVoice = false;
}


// Event listener for commands


let player = createAudioPlayer();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setPresence({
    activities: [{ name: `Powered by Neotastisch`, type: ActivityType.Listening }],
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

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if(commandName == "skip"){
    connection.player.stop();
    start()
  }
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
  let resource = createAudioResource("./warte.mp3")
  player.play(resource)
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
const time = todaysDate.getHours()+":"+todaysDate.getMinutes()

try{
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINIKEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const msg = `speak ${process.env.language} the whole time. Imagine you are an AI DJ in an online radio station. Some things about it: ${JSON.stringify(dataradio)}. Write it like this message is after a song. You should talk something about ${newsItem.title} now. Write it as if it could be broadcast directly, don't invent anything. Data: ${newsItem.description}. Then say that the song ${nextSong} you will play next.  Time: ${time}`;

  const result = await model.generateContent(msg);
  const text = result.response.text();

  console.log('Generated text:', text);
  playAudio(url, text);
}catch(err){
  console.log(err);
  playAudio(url, process.env.errormessage)
}
}

async function playAudio(link, message) {
  console.log('Playing audio message and song...');

  if(premiumVoice == false){
  const messageParts = splitString(message);
  playTextToSpeechOld(messageParts.shift());
  setTimeout(function(){
  player.on(AudioPlayerStatus.Idle, () => {
    if (messageParts.length === 0) {
      player.removeAllListeners();
      playSong(link);
    } else {
      playTextToSpeechOld(messageParts.shift());
    }
  });
},3000)
}else{
  playTextToSpeech(message);
  setTimeout(function(){
    player.on(AudioPlayerStatus.Idle, () => {
      playSong(link);
  });
  },3000)

}
}

function playTextToSpeechOld(text) {
  const stream = discordTTS.getVoiceStream(text);
  const audioResource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
  player.play(audioResource);
}

async function playTextToSpeech(text) {
  const stream = await voice.textToSpeechStream({
    textInput: text,
    responseType: 'stream', // Stream the audio directly
    voiceId:         "Jdr9LWY1JEhgc5qzlOyT",         // A different Voice ID from the default
    modelId:         "eleven_multilingual_v2",       // The ElevenLabs Model ID
    responseType:    "stream",                       // The streaming type (arraybuffer, stream, json)    
  });

  const audioResource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

  player.play(audioResource);
}

function playSong(link) {
  console.log('Playing song:', link);
  
  // Adjust the options for better audio quality
  const stream = ytdl(link, { filter: 'audioonly', quality: 'highestaudio' });

  const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });

  // Replace the previous player with the updated one
  player.play(resource);
  
  player.on(AudioPlayerStatus.Idle, () => {
    queue(); // Implement your queue logic here
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
