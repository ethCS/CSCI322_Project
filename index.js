require('dotenv').config();

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const Alexa = require('ask-sdk-core');
const admin = require('firebase-admin');
const axios = require('axios');

const params = {};

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

admin.initializeApp(firebaseConfig);

const db = admin.firestore();
const collectionName = "users";
const catFactRef = db.collection('Facts').doc('Cat');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speakOutput = 'Welcome to Fact Master. This is running on Firebase! Ask me for a fact.';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

const GetFactIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetFactIntent';
  },
  handle(handlerInput) {
    const facts = [
      'A bolt of lightning contains enough energy to toast 100,000 slices of bread.',
      'You can’t hum while holding your nose.',
      'The total weight of ants on Earth once equaled the total weight of all humans.',
      'Wombat poop is cube-shaped.'
    ];

    const randomFact = facts[Math.floor(Math.random() * facts.length)];

    return handlerInput.responseBuilder
      .speak(randomFact)
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'
      );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Goodbye!')
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(`Error: ${error.message}`, error);
    return handlerInput.responseBuilder
      .speak('Sorry, I had trouble connecting to my Firebase brain.')
      .getResponse();
  }
};

const skillBuilder = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GetFactIntentHandler,
    CancelAndStopIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .create();

exports.alexaSkill = onRequest(async (request, response) => {
  try {
    const responseEnvelope = await skillBuilder.invoke(request.body);
    response.send(responseEnvelope);
  } catch (error) {
    console.error(error);
    response.status(500).send('Error processing the Alexa request');
  }
});

exports.writeUser = onRequest(async (request, response) => {
  const newUser = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    age: 28,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const userRef = await db.collection(collectionName).add(newUser);
  response.send(`CREATE: Document created with ID: ${userRef.id}`);
});

exports.readUser = onRequest(async (request, response) => {
  const userRef = db.collection(collectionName).doc("6hZqLTm7UMOCvasmEv0E");
  const doc = await userRef.get();

  if (!doc.exists) {
    response.status(404).send("Document not found");
    return;
  }

  response.send(doc.data());
});

exports.updateUser = onRequest(async (request, response) => {
  await db.collection(collectionName).doc("6hZqLTm7UMOCvasmEv0E").update({
    age: 29,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });

  response.send("Updated age to 29.");
});

exports.queryUser = onRequest(async (request, response) => {
  const snapshot = await db.collection(collectionName).where('age', '>', 25).get();

  if (snapshot.empty) {
    response.send("No matching docs");
    return;
  }

  let str = "";
  snapshot.forEach(doc => {
    str += ` - ${doc.id} => ${doc.data().name} (Age: ${doc.data().age})`;
  });

  response.send(str);
});

exports.pubsub = onSchedule("0 * * * *", async () => {
  try {
    const response = await axios.get('https://cat-fact.herokuapp.com/facts', { params });

    await catFactRef.set({
      current: response.data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error fetching cat facts:", error);
  }
});
