const { onRequest } = require("firebase-functions/v2/https");
const Alexa = require('ask-sdk-core');
const admin = require('firebase-admin');

const firebaseConfig = {
  apiKey: "AIzaSyDQ4SAHB1QLpNlEfqsT2A6VX2guRWoUy4o",
  authDomain: "csciumt.firebaseapp.com",
  projectId: "csciumt",
  storageBucket: "csciumt.firebasestorage.app",
  messagingSenderId: "29183526258",
  appId: "1:29183526258:web:7e26bcfdde93ec69b309eb",
  measurementId: "G-4LRNY0XPC4"
};

admin.initializeApp(firebaseConfig);

const db = admin.firestore();
const collectionName = "users";

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
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Goodbye!')
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() { return true; },
    handle(handlerInput, error) {
        console.error(`Error: ${error.message}`);
        return handlerInput.responseBuilder
            .speak('Sorry, I had trouble connecting to my Firebase brain.')
            .getResponse();
    }
};

// Create the SDK instance
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
        // Alexa sends a POST request. The SDK processes the request body and returns the JSON response.
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

    const docRef = await db.collection(collectionName).add(newUser);
    const userID = docRef.id;

    response.send(`CREATE: Document created with ID: ${userID}`)
})

exports.readUser = onRequest( async (request, response)=>{
    const docRef = await db.collection(collectionName).doc("6hZqLTm7UMOCvasmEv0E");
    docRef.get().then(doc=>{
        if(doc.exists){
            response.send(doc)
        }
    })
})

exports.updateUser = onRequest( async (request, response)=>{
    await db.collection(collectionName).doc("6hZqLTm7UMOCvasmEv0E").update({
        age: 29,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    })
    response.send("Updated age to 29.")
})

exports.queryUser = onRequest( async (request, response)=>{
    const snapshot = await db.collection(collectionName).where('age', '>', 25).get();
    var str = ""
    if (snapshot.empty){
        response.send("No matching Docs")

    }
    else{
        snapshot.forEach(doc=>{
            str += ` - ${doc.id} => ${doc.data().name} (Age: ${doc.data().age})`
            
        })
        response.send(str);
    }
})