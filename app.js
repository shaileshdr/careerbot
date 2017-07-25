var builder = require('botbuilder');


var botConnectorOptions = {

    appId: process.env.MICROSOFT_APP_ID,

    appPassword: process.env.MICROSOFT_APP_PASSWORD

};

// create the connector
var connector = new builder.ChatConnector(botConnectorOptions);
var dir = __dirname;

var restify = require('restify');

var express = require('express');
var app = express();
app.use('/images', express.static(__dirname + '/images'));

var server = restify.createServer();

// Serve a static web page

server.get(/\/?.*/, restify.serveStatic({
    directory: __dirname,
    default: 'index.html',
    match: /^((?!app.js).)*$/   // we should deny access to the application source
}));

server.post('/api/messages', connector.listen());

server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// create the bot
//var bot = new builder.UniversalBot(connector);
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Welcome to AI Buddy Bot!");
        //session.beginDialog("mainMenu");
        builder.Prompts.choice(session, 'Would you like to know how I can help you?', 'Yes|No', { listStyle: builder.ListStyle.button});
    },
    function (session, results, next) {
        if (results.response.entity == 'Yes') {
            builder.Prompts.choice(session, 'Where would you like to start?', 'Sample Questions|Topics I can help with', { listStyle: builder.ListStyle.button });
        } else { session.endDialog('OK. Remember, you can ask questions like \'who can mentor me? \' or \'Events around me\''); }
    },
    function (session, results) {
        var temp = results.response.entity;
        switch (temp) {
            case 'Sample Questions':
                var mes = 'You can ask questions like \'Who can Mentor me \' or \'Events around me\' or say things like \' I want to learn Nodejs \'';
                break;
            case 'Topics I can help with':
                var mes = 'I can help you with Networking, finding a new job, or finding training';
                break;
        }
        session.send(mes);
        session.endDialog('What is your question?');
    }
]);

var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/eaafbe33-c331-4d34-b9bc-fbee88afd390?subscription-key=bd51ef0b83a247038d746690a5ed9829&staging=true&verbose=true&timezoneOffset=0&q=';
var reco = new builder.LuisRecognizer(model);
bot.recognizer(reco);

bot.dialog("mainMenu", [
    function (session) {
        builder.Prompts.choice(session, 'What would you like to do', 'Network|Find Training or Events| Find a new job', {
            listStyle: builder.ListStyle.button
        })
    },
    function (session, results) {
        if (results.response) {
            session.send('reveived' + results.response);
            session.endDialog();
        }
    }
])
.triggerAction({
    matches: ['Hi', 'Hello']
});
bot.dialog('Networking', [
    function (session, args, next) {
        //session.send('you are in the People dialog', session.userData.profile);
        try {
            var discip = builder.EntityRecognizer.findEntity(args.intent.entities, 'Discipline');
            //if (discip) { session.send('Extracted discipline as ' + discip.entity); }
            var prsn = builder.EntityRecognizer.findEntity(args.intent.entities, 'Person')
            //if (prsn) { session.send('Extracted person as' + prsn.entity); }

            var message = 'Sure thing. Any specific function like Dev or PM?';
            builder.Prompts.text(session, message);

        }
        catch (err) { session.send(err.message); }
    },
    function (session, results, next) {
        try {
            session.send('Got it... Here are some people you may know');
            var Range = ['Charles', 'Jason', 'Ankur', 'Ann', 'Peter', 'Martin'];
            var cards = Range.map(function (x) { return createCard(session, x, 'personlookup') });

            var message = new builder.Message(session).attachments(cards).attachmentLayout('carousel');
            builder.Prompts.text(session, message);
        } catch (err) {
            session.send(err.message);
        }
    },
    function (session, results, next) {
        if (results.response) {
            var temp = results.response;
            temp = temp.substring(temp.indexOf("__") + 2);
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
})
    .cancelAction('cancelAction', 'OK. Remember, you can ask questions like \'who can mentor me? \' or \'Events around me\'', {
        matches: /^nevermind$|^start over$|^cancel$|^cancel.*order/i
    });

bot.dialog('Upskill', [
    function (session, args, next) {
        //session.send('you are in the People dialog', session.userData.profile);
        try {
            var eventEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'trainingtype');
            if (eventEntity) { session.send('Extracted ' + eventEntity.entity); session.userData.event = eventEntity.entity; }

            var skillName = builder.EntityRecognizer.findEntity(args.intent.entities, 'skill');
            session.userData.skill = skillName.entity;
            if (!session.userData.skill) {
                builder.Prompts.text(session, 'What skill set are you looking for? You can say things like \'I want to learn Nodejs\'');
            } else { next(); }
        }
        catch (err) { session.send('upskill catch: ' + err); }
    },
    //function (session, results, next) {
    //    try {
    //        if (results.response) { session.userData.skill = results.response; }
    //        if (!session.userData.commit) {
    //            builder.Prompts.choice(session, 'Optimze for', 'Paid|Duration|All', { listStyle: builder.ListStyle.button });
    //        } else { next(); }
    //    } catch (err) { session.send('In error area 1'); }
    //},
    function (session, results, next) {
        try {
            if (results.response) { session.userData.commit = results.response.entity; }
            session.send(session.userData.skill + ' is hot right now. Here are some popular classes to check out');
            var eventRange = ['node1', 'node2', 'node3', 'node4', 'node5', 'node6'];
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
            //session.send('Received ' + results.response.entity);
            session.endDialog('Added to your calendar');
        } catch (err) { session.send('In error area 4'); }
    }
]).triggerAction({
    matches: ['Upskill', 'training', 'trainingtype'],
    onInterrupted: function (session) {
        session.endConversation('Please provide additional upskill information');
    }
}).cancelAction('cancelAction', 'OK. Remember, you can ask questions like \'who can mentor me? \' or \'Events around me\'', {
    matches: /^nevermind$|^start over$|^cancel$|^cancel.*order/i
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

bot.dialog('JobIntent', [
    
    //Step1
    function (session, args, next) {
        var teamEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'team');
            if (teamEntity) { session.userData.team = teamEntity.entity.charAt(0).toUpperCase() + teamEntity.entity.slice(1); }
        console.log(session.userData.team);
        if (!session.userData.team) {
            session.send('Which team you would like to work for?');
            builder.Prompts.text(session, 'Let me know your preference such as "C&E", "Office", "Azure"!');
        }
        else {
            next();
        } 
    },
    //Step2
    function (session, result, next) {
        if (result && !session.userData.team) {
            console.log(result);
            session.userData.team = result.response;
        }
        next();
    },
    //Step3
    function (session, result, next) {
        session.send(session.userData.team + ' is a great team! Here are some jobs based on your skill interest and level.');
        var jobRange = ['SWE', 'SWE2', 'DataScientist', 'SWE3', 'SWE4'];
        var cards = jobRange.map(function (x) { return createAIJobCard(session,x) });
        var message = new builder.Message(session).attachments(cards).attachmentLayout('carousel');;
        builder.Prompts.text(session, message)
    },

    //Step4
    function (session, result, next) {
        session.send('Also, I have set up daily alerts for all open ' + session.userData.team + ' roles! Please check your email.');
        session.endDialog();
    }

]).triggerAction({
    matches: ['JobIntent'],
    onInterrupted: function (session) {
        session.send('Please provide additional job intent information');
    }
    }).cancelAction('cancelAction', 'OK. Remember, you can ask questions like \'who can mentor me? \' or \'Events around me\'', {
        matches: /^nevermind$|^start over$|^cancel$|^cancel.*order/i
});

bot.dialog('EasterEgg', [
    function(session, args, next) {
        var easterRange = ['TeamPic', 'TeamPic2'];
        var cards = easterRange.map(function (x) { return createEasterEggGroupCard(session,x) });
        var message = new builder.Message(session).attachments(cards).attachmentLayout('carousel');;
        builder.Prompts.text(session, message)
    },
    function (session, response) {
        var easterRange = ['Charles', 'Jason', 'Ankur', 'Xue', 'Shailesh', 'Ann', 'Gerardo'];
        var cards = easterRange.map(function (x) { return createEasterEggIndividualCard(session,x) });
        var message = new builder.Message(session).attachments(cards).attachmentLayout('carousel');;
        builder.Prompts.text(session, message)
    },
    function(session, next) {
        session.endDialog();
    }

]).triggerAction({
    matches:['EasterEgg'],
    onInterrupted: function (session) {
        session.send('Please provide additional easter egg information');
    }
    }).cancelAction('cancelAction', 'OK. Remember, you can ask questions like \'who can mentor me? \' or \'Events around me\'', {
        matches: /^nevermind$|^start over$|^cancel$|^cancel.*order/i
})

function createEasterEggGroupCard(session, value) {
    switch (value) {
        case 'TeamPic':
            var title = ""
            break;
        case 'TeamPic2':
            var title = "";
            break;
    }

    return new builder.HeroCard(session)
    .title(title)
    .images([
        builder.CardImage.create(session, dir + '/images/' + value + '.jpg')
    ])
    .buttons([
        builder.CardAction.postBack(session, 'MeetTeam' , 'Meet the team behind CareerBot! :)')
    ]);

}

function createEasterEggIndividualCard(session, value) {
    switch (value) {
        case 'Charles':
            var description = 'Global Program Manager @ Microsoft. Ghana native. Chicago Booth MBA & Tufts Engineering Grad. \n <alias>';
            var name = 'Charles Wartemberg';
            var title = 'Team Lead';
            break;
        case 'Jason':
            var description = 'Jason Geiger, a digital experience designer, developer, strategist with over 8 years of experience working with national B2B and B2C brands';
            var name = 'Jason Geiger';
            var title = 'Strategist Team';
            break;
        case 'Ann':
            var description = 'HR Trax intern with Global Talent acquisition for Engineering & Operations. Joint degree(MBA|MHRIR) candidate at the University of Illinois, Urbana-Champaign. '
            var name = 'Ann Mary George';
            var title = 'Strategist Team';
            break;
        case 'Shailesh':
            var description = ''
            var name = 'Shailesh Ratadia'
            var title = 'Developer Team';
            break;
        case 'Xue':
            var description = 'Data Scientist in Microsoft HR department.'
            var name = 'Xue Liu'
            var title = 'Strategist Team';
            break;
        case 'Ankur':
            var description = 'CareerBuddy Dev Team Member. Ankur recently completed his Masters in Computer Science at USC. Currently, he is working on a new service at Microsoft Azure: Container Registry for Docker';
            var name = 'Ankur Khemani';
            var title = 'Developer Team';
            break;
        case 'Gerardo':
            var description = 'Gerardo is an undergraduate student at the University of Texas at El Paso! Currently, he is interning on the Azure IoT team as an explorer intern working on a User Journey project.'
            var name = 'Gerardo Uranga'
            var title = 'Developer Team';
            break;
        default:
            var txt = 'hi';
    }

    return new builder.HeroCard(session)
    .title(name)
    .subtitle(title)
    .text(description)
    .images([
        builder.CardImage.create(session, dir + '/images/' + value + '.jpg')
    ])
    .buttons([
        builder.CardAction.postBack(session, 'Email' , 'Email us at careerbot@microsoft.com')
    ]);

}

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
            builder.CardImage.create(session, __dirname + "/images/" + value + ".jpg")
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://www.linkedin.com/in/ankurkhemani/', 'View Linked In profile'),
            builder.CardAction.postBack(session, tag + "__" + value, 'Setup a meeting'),
            builder.CardAction.postBack(session, 'http://www.twitter.com', 'Follow on Twitter'),
        ]);
}
function createTrainingCard(session, value, tag) {
    switch (value) {
        case 'node1':
            var txt = 'Equip yourself with the knowledge to build, test, deploy, and scale Node.js web applications in production';
            var title = 'Zero to Production Node.js';
            var url = 'https://www.lynda.com/Node-js-tutorials/Zero-Production-Node-js-Amazon-Web-Services/604260-2.html';
            break;
        case 'node2':
            var txt = 'Learning how to build an API with Node.js can sometimes be overwhelming. In this course, join Scott Moss as he explains how to design, build, test, and deploy a RESTful API using Node.js and Mongo.';
            var title = 'API Design in Node.js Using Express and Mongo';
            var url = 'https://www.lynda.com/Node-js-tutorials/API-Design-Node-js-Using-Express-Mongo/604259-2.html';
            break;
        case 'node3':
            var txt = 'Are you already familiar with Angular 2 and Node.js? If so, this course can help you leverage these two popular frameworks to build a full-stack web application';
            var title = 'Building a Simple Full-Stack App with Angular 2, Node.js';
            var url = 'https://www.lynda.com/AngularJS-tutorials/Building-Simple-Full-Stack-App-Angular-2-Node/576588-2.html';
            break;
        case 'node4':
            var txt = 'Build a microservice-based system using Node.js. In the industry, Node.js is widely used to implement microservices that consume and provide APIs.';
            var title = 'Building a Slack Bot with Node.js Microservices';
            var url = 'https://www.lynda.com/Node-js-tutorials/Building-Slack-Bot-Node-js-Microservices/509406-2.html';
            break;
        case 'node5':
            var title = 'Building Functional Prototypes using Node.js';
            var txt = 'Learn the basics of back-end web development as you create a simple web application server using Node.js.';
            var url = 'https://www.edx.org/course/building-functional-prototypes-using-microsoft-dev280x';
            break;
        case 'node6':
            var title = 'Real-Time Web with Node.js';
            var txt = 'Accelerate your development efforts by learning how to work with HTML5 APIs for real-time communications using Node.js.';
            var url = 'https://www.lynda.com/Node-js-tutorials/Real-Time-Web-Node-js/573614-2.html';
            break;
    }

    return new builder.HeroCard(session)
        .title(title)
        .subtitle(txt)
        .images([
            builder.CardImage.create(session, __dirname + "/images/" + value + ".png")
        ])
        .buttons([
            builder.CardAction.openUrl(session, url, 'View course details'),
            builder.CardAction.dialogAction(session, 'skill', title, 'Add to Calendar')
        ]);
}

function createAIJobCard(session, value) {
    var smallest = "We are creating the future of real-time analytics. We are re-imagining what it could be so we can deliver a modern analytics experience and enable anyone to collect, process, and visualize data in minutes. We are empowering people to build incredible products using data-driven insight."
    var sn = smallest.length;
    switch(value) {
        case 'SWE':
            var title = 'Software Engineer';
            var location = 'Redmond, WA'
            var level = '62'
            var description = "Come work for the Azure IoT team. We are paving the road for connecting devices to the Cloud! \
            If connecting the world and developing great products is your forte, we’d love to hear from you. \
            We try new ideas and fail-fast. We use the minimal process needed to deliver great results as a team. \
            We love delighting our customers and aim to deliver an exceptional platform and user experience.".substring(0, sn) + "...";
            break;
        case 'SWE2':
            var title = 'Senior Software Engineer';
            var location = 'Sunnyvale, CA'
            var level = '62'
            var description = ("We are looking for software engineers or “wiz coders” who are passionate about data and want to \
            apply machine learning techniques to solve real-world problems for enterprises and consumers. You will help develop \
            capabilities for deep learning models and tools and solutions around it. You will work with data from diverse structured \
            and unstructured data sources in both batch and streaming modes, and various formats including tabular, image/video, audio, \
            text and time series.").substring(0, sn) + "...";
            break;
        case 'DataScientist':
            var title = 'Data Scientist'
            var location = 'Austin, TX'
            var level = '61'
            var description = ("We are creating the future of real-time analytics. We are re-imagining what it could be so we can deliver a modern analytics experience and enable anyone to collect, process, and visualize data in minutes. We are empowering people to build incredible products using data-driven insight.").substring(0, sn) + "...";
            break;
        case 'SWE3':
            var title = 'Software Engineer'
            var location = 'Redmond, WA'
            var level = '61'
            var description = ("We are a small, rapidly growing team. We value people, learning, and doing the right thing. \
            We cultivate a high-trust environment with great collaboration and fun. We want people who envision what could be, \
            help others succeed, and learn constantly. We try new ideas and fail-fast. We use the minimal process needed to deliver \
            great results as a team. We love delighting our customers and aim to deliver an exceptional platform and user experience.").substring(0, sn) + "...";
            break;
        case 'SWE4':
            var title = 'Software Engineer'
            var location = 'Redmond, WA'
            var level = '63'
            var description = "Do you love gadgets? Do you love to build experiences that “just work” to make your life easier? \
            Do you love making devices more intelligent and useful? Cortana Home Automation is a newly formed team that works on \
            enabling rich Cortana experiences for a variety of devices. We work closely with partners across and outside the company \
            to deliver a set of experiences that empower users by providing truly assistive capabilities.".substring(0, sn) + "...";
            break;
        default:
            title = '';
    }
        

    return new builder.HeroCard(session)
        .title(title)
        .subtitle(location)
        .text(level)
        .text(description)
        .images([
            builder.CardImage.create(session, dir + '/images/SWE.jpg')
        ])
        .buttons([
            builder.CardAction.postBack(session, 'Apply', 'Apply'),
            builder.CardAction.postBack(session, 'Bookmark', 'Bookmark'),
            builder.CardAction.postBack(session, 'Contact Recruiter', 'Contact Recruiter')
        ]);
}


