var builder = require('botbuilder');
var restify = require('restify');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
//server.listen(3978, function () {
//    console.log('%s listening to %s', server.name, server.url);
//});

// create the connector
var connector = new builder.ChatConnector();

// create the bot
var bot = new builder.UniversalBot(connector);

//add dialog
//bot.dialog("/", function (session) {
    
//    var userMessage = session.message.text;
//    session.send('You Said: ' + userMessage);
//});
var model = process.env.model || 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/4e2bf8c6-1668-4f04-ad5c-50754776e149?subscription-key=c5425af1b05e4be1a5ea767cb4abda28&timezoneOffset=0&verbose=true&q=';
bot.recognizer(new builder.LuisRecognizer(model));

bot.dialog("/", [
    function (session) {
        session.beginDialog('/ensureprofile', session.userData.profile);
    },
    function (session, result) {
        session.userData.profile = result.response;
        session.send('Hello %(name)s, looks like you work at %(company)s and are interested in a career in %(career)s', session.userData.profile);
    }

]);

bot.dialog('/ensureprofile', [
    function (session, args, next) {
 
        session.dialogData.profile = args || {};
        //var name = builder.EntityRecognizer.findEntity(args.intent.entities, 'username');
        try {
            var peopleEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Discipline');
        }
        catch (err) { console.write(err.message); }

        if (!session.dialogData.profile.name) {
            builder.Prompts.text(session, 'Hi, What is your name?');
        }
        else { next();}
    },
    function (session, results, next) {
        if (results.response) {
            session.dialogData.profile.name = results.response;
        }
        if (!session.dialogData.profile.company) {
            builder.Prompts.text(session, 'Hi %(name)s, Which company do you work for?', session.userData.profile);
        } else { next();}
    },
    function (session, result, next) {
        if (result.response) {
            session.dialogData.profile.company = result.response;
        }
        if (!session.dialogData.profile.career) {
            
            var careerRange = ['Engineering', 'Marketing', 'Sales', 'Services', 'Business Development'];
            var cards = careerRange.map(function (x) { return createCard(session,x) });
            //builder.Prompts.choice(session, 'What is your age group?', agerange );

            var message = new builder.Message(session).attachments(cards).attachmentLayout('carousel');;
            //session.send(message, session.userData.profile);
            builder.Prompts.text(session, message)
        } else {
            next();
        }
    },
    function (session, result) {
        if (result.response) {
            session.dialogData.profile.career = result.response;
        }
        session.endDialogWithResult({ response: session.dialogData.profile });
    }
]);

server.post('/api/messages', connector.listen());

function createCard(session, value) {
    var card = new builder.ThumbnailCard(session)
    .title(value)
    //card.images([builder.CardImage.create(session, profile.imageurl)]);
    card.tap(new builder.CardAction.imBack(session, value, 'CSP'));
    return card;
}

    