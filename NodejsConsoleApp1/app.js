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
//var bot = new builder.UniversalBot(connector);
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Welcome to AI Buddy Bot!");
        //session.beginDialog("mainMenu");
    }
]);

//add dialog
//bot.dialog("/", function (session) {
    
//    var userMessage = session.message.text;
//    session.send('You Said: ' + userMessage);
//});
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/4e2bf8c6-1668-4f04-ad5c-50754776e149?subscription-key=8e78db55acfb474aa6e5de3ad50ed781&staging=true&timezoneOffset=0&verbose=true&q=';
var reco = new builder.LuisRecognizer(model);
bot.recognizer(reco);

//bot.dialog("/", [
//    function (session) {
//        session.beginDialog('/ensureprofile', session.userData.profile);
//    },
//    function (session, result) {
//        session.userData.profile = result.response;
//        session.send('Hello %(name)s, looks like you work at %(company)s and are interested in a career in %(career)s', session.userData.profile);
//    }

//]);
bot.dialog("mainMenu", [
    function (session) {
        builder.Prompts.choice(session, 'What would you like to do', 'Network|Find Training or Events| Find a new job', {
            listStyle: builder.ListStyle.button
        })
    },
    function (session, results) {
        if (results.response) {
            session.send('reveived' + results.response);
        }
    }
])
.triggerAction({
    matches: /^clear$/i,
    confirmPrompt: "This will reset your session. Are you sure?"
});
bot.dialog('Networking', [
    function (session, args, next) {
        //session.send('you are in the People dialog', session.userData.profile);
        try {
            var discip = builder.EntityRecognizer.findEntity(args.intent.entities, 'Discipline');
            if (discip) { session.send('Extracted discipline as ' + discip.entity); }
            var prsn = builder.EntityRecognizer.findEntity(args.intent.entities, 'Person')
            if (prsn) { session.send('Extracted person as' + prsn.entity); }

            session.send('Here are some people you may know...');
            var Range = ['Charles', 'Jason', 'Ankur', 'Ann', 'Peter', 'Martin'];
            var cards = Range.map(function (x) { return createCard(session, x, 'personlookup') });

            var message = new builder.Message(session).attachments(cards).attachmentLayout('carousel');
            builder.Prompts.text(session, message);

        }
        catch (err) { session.send(err.message); }
    },
    function (session, results, next) {
        if (results.response) {
            var temp = results.response;
            temp = temp.substring(temp.indexOf("__")+2);
            var meetMsg = 'Would you like to setup a meeting with:  ' + temp + '?';
            //session.send(meetMsg);
            builder.Prompts.choice(session, meetMsg, 'Yes|No', { listStyle: builder.ListStyle.button });
        }
    },
    function (session, results) {
        session.send('Received ' + results.response.entity);
        session.endDialog('Bye');
    }
]).triggerAction({
    matches: 'Networking',
    onInterrupted: function (session) {
        session.send('Please provide additional networking information');
        session.endDialog('Bye');
    }
});

bot.dialog('Upskill', [
    function (session, args, next) {
        //session.send('you are in the People dialog', session.userData.profile);
        try {
            var eventEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'trainingtype');
            if (eventEntity) { session.send('Extracted ' + eventEntity.entity); session.userData.event = eventEntity.entity; }

            var skilltype = builder.EntityRecognizer.findEntity(args.intent.entities, 'skill');
            if (skilltype) { var skl = skilltype.entity; session.userData.skill = skl; next()}
            else { builder.Prompts.text('What skill set are you looking for') }
        }
        catch (err) { session.send('upskill catch: ' + err.message); }
    },
    function (session, results, next) {
        try {
            if (results.response) { session.userData.skill = results.response; }
            if (!session.userData.commit) {
                builder.Prompts.choice(session, 'Optimze for', 'Paid|Duration|All', { listStyle: builder.ListStyle.button });
            } else { next(); }
        } catch (err) {session.send('In error area 1') }
    },
    function (session, results, next) {
        try {
            if (results.response) { session.userData.commit = results.response.entity; }
            session.send('Here are some events relevant to ' + session.userData.skill + ' which of these look interesting?');
            var eventRange = ['Java', 'Training 2', 'Training 3', 'Training 4', 'Training 5', 'Training 6'];
            var cards = eventRange.map(function (x) { return createTrainingCard(session, x, 'training') });
            var message = new builder.Message(session).attachments(cards).attachmentLayout('carousel');
            builder.Prompts.text(session, message);
        } catch (err) { session.send('In error area 2'); }
    },
    function (session, results, next) {
        try {
            if (results.response) {
                var temp = results.response;
                temp = temp.substring(temp.indexOf("=") + 1);
                var meetMsg = 'Would you like to attend ' + temp + '?';
                builder.Prompts.choice(session, meetMsg, 'Yes|No', { listStyle: builder.ListStyle.button });
            } else (session.send('Did not get a response'));
        } catch (err) { sessoin.send('In error area 3'); }
    },
    function (session, results) {
        try {
            session.send('Received ' + results.response.entity);
            session.endDialog('Enjoy the Event for ' + session.userData.skill + 'in the category ' + session.userData.commit);
        } catch (err) { session.send('In error area 4'); }
    }
]).triggerAction({
    matches: ['Upskill', 'training', 'trainingtype'],
    onInterrupted: function (session) {
        session.send('Please provide additional upskill information');
    }
});

bot.dialog('/ensureprofile', [
    function (session, args, next) {
 
        session.dialogData.profile = args || {};
        //var name = builder.EntityRecognizer.findEntity(args.intent.entities, 'username');
        try {
            var peopleEntity = builder.EntityRecognizer.findEntity(args.entities, 'Discipline');
            
        }
        catch (err) { session.send(err.message); }

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
            builder.Prompts.text(session, 'Hi' + session.dialogData.profile.name + ', Which company do you work for?');
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

function createCard(session, value, tag) {
    switch (value){
        case 'Charles':
            var txt = 'Global Program Manager @ Microsoft. Ghana native. Chicago Booth MBA & Tufts Engineering Grad. Amazon & McMaster - Carr Alum.Co - owner of @WishfulThinkerClothing';
            var title = 'Global Program Manager';
            break;
        case 'Jason':
            var txt = 'Jason Geiger, a digital experience designer, developer, strategist with over 8 years of experience working with national B2B and B2C brands';
            var title = 'UX Designer';
            break;
        case 'Ankur':
            var txt = 'Ankur recently completed his Masters in Computer Science at USC. Currently, he is working on a new service at Microsoft Azure: Container Registry for Docker';
            var title = 'Software Design Engineer';
            break;
        default:
            var txt = 'Default Content';
            var title = 'Rockstar';
            break;
    }
    //var car = new builder.HeroCard(session);
    //https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg

    //var card = new builder.ThumbnailCard(session)
    //    .title(value)
    //    .subtitle(tag)
    // card.images([builder.CardImage.create(session, profile.imageurl)]);
    //card.tap(new builder.CardAction.imBack(session, value, tag));
    //card.tap(new builder.CardAction.postBack(session, tag + "__" + value));
    // return card;
    return new builder.HeroCard(session)
        .title(value)
        .subtitle(title)
        .text(txt)
        .images([
            builder.CardImage.create(session, 'C:\\Users\\shailr\\documents\\visual studio 2015\\Projects\\NodejsConsoleApp1\\NodejsConsoleApp1\\' + value +'.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://www.linkedin.com/in/ankurkhemani/', 'View Linked In profile'),
            builder.CardAction.postBack(session, tag + "__" + value, 'Setup a meeting'),
            builder.CardAction.postBack(session, 'http://www.twitter.com', 'Follow on Twitter'),
        ]);
}
function createTrainingCard(session, value, tag) {
    return new builder.HeroCard(session)
        .title(value)
        .subtitle(tag)
        .images([
            builder.CardImage.create(session, 'C:\\Users\\shailr\\documents\\visual studio 2015\\Projects\\NodejsConsoleApp1\\NodejsConsoleApp1\\training.png')
        ])
        .buttons([
            //builder.CardAction.postBack(session, tag + "__" + value, 'Add to Schedule'),
            builder.CardAction.dialogAction(session, 'skill', value, 'Add to Calendar')
        ]);
}
