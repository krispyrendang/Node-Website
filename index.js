require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const expireTime = 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)

//Users and Passwords (in memory 'database')
var users = [];

/* secret information section */
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

app.set('view engine', 'ejs');

app.use(express.urlencoded({
    extended: false
}));

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@cluster0.o0kpuux.mongodb.net/?retryWrites=true&w=majority`,
    crypto: {
        secret: mongodb_session_secret
    }
})
app.use(session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store 
    saveUninitialized: false,
    resave: true
}));

app.get('/', (req, res) => {
    res.render("index");
});

app.get('/signup', (req, res) => {
    var missingInfo = req.query.missing;
    res.render("createUser", {
        missing: missingInfo
    });

});

app.get('/login', (req, res) => {
    res.render("login", {
        error: "none"
    });
});

app.get('/members', (req, res) => {

    if (req.session.authenticated) {


        var bruh = Math.floor(Math.random() * 3);

        res.render("members", {
            username: req.session.username,
            random_image: bruh
        });


    } else {
        res.redirect('/index?user%20not%20logged%20in');
    }
});

app.post('/submitUser', (req, res) => {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    var hashedPassword = bcrypt.hashSync(password, saltRounds);

    if (!username) {
        res.redirect('/signup?missing=username');

    } else if (!email) {
        res.redirect('/signup?missing=email');

    } else if (!password) {
        res.redirect('/signup?missing=password');

    } else {
        users.push({
            username: username,
            email: email,
            password: hashedPassword
        });

        req.session.authenticated = true;
        req.session.username = username;
        req.session.cookie.maxAge = expireTime;

        res.redirect('/members');
    }

});

app.post('/loggingin', (req, res) => {
    var email = req.body.email;
    var password = req.body.password;

    for (i = 0; i < users.length; i++) {
        if (users[i].email == email) {
            if (bcrypt.compareSync(password, users[i].password)) {
                req.session.authenticated = true;
                req.session.username = users[i].username;
                req.session.cookie.maxAge = expireTime;
                res.redirect('/members');
                return;
            } else {
                console.log("invalid password");
                res.redirect('/login?error=password');
                return;

            }
        } else {
            console.log("invalid email");
            res.redirect('/login?error=email');
            return;

        }
    }

});

app.post('/logout', (req, res) => {

    req.session.authenticated = false;
    res.render("index");

});

app.get('/cat/:id', (req, res) => {
    var cat = req.params.id;

    res.render("cat", {
        cat: cat
    });
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.render("404");
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
});