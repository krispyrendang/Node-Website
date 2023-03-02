require('./utils');
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const database = include('databaseConnection');
const db_utils = include('database/db_utils');
const db_users = include('database/users');
const success = db_utils.printMySQLVersion();

const port = process.env.PORT || 3000;

const app = express();

const expireTime = 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)

//Users and Passwords (in memory 'database')
// var users = [];

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

app.get('/todo', async (req, res) => {
    var missingInfo = req.query.missing;
    user_id = req.session.user_id;
    username = req.session.username;

    if (!isValidSession(req)) {
        res.redirect("/");
    } else {
        var resultList = await db_users.getToDoList({
            user_id
        });

        console.log(user_id);

        if (resultList) {

            res.render("todo", {
                list: resultList,
                username,
                missing: missingInfo
            });
        } else {
            res.render("todo", {
                list: "none",
                username,
                missing: missingInfo
            });
        }
    }

});

app.get('/login', (req, res) => {
    res.render("login", {
        error: "none"
    });
});

app.get('/members', (req, res) => {

    if (!isValidSession(req)) {
        res.redirect("/");
    } else {

        var bruh = Math.floor(Math.random() * 3);

        res.render("members", {
            username: req.session.username,
            random_image: bruh
        });
    }

});

app.get('/createTables', async (req, res) => {

    const create_tables = include('database/create_tables');

    var success = create_tables.createTables();
    if (success) {
        res.render("successMessage", {
            message: "Created tables."
        });
    } else {
        res.render("errorMessage", {
            error: "Failed to create tables."
        });
    }
});

app.post('/submitUser', async (req, res) => {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    var hashedPassword = bcrypt.hashSync(password, saltRounds);

    if (!isValidSession(req)) {
        res.redirect("/");
    } else {
        if (!username) {
            res.redirect('/signup?missing=username');

        } else if (!email) {
            res.redirect('/signup?missing=email');

        } else if (!password) {
            res.redirect('/signup?missing=password');

        } else {
            var success = await db_users.createUser({
                username: username,
                email: email,
                hashedPassword: hashedPassword
            });
            console.log(username)
            console.log(email)
            console.log(hashedPassword)


            if (success) {
                var results = await db_users.getUsers();
                req.session.authenticated = true;
                req.session.user_type = results[0].user_type;
                req.session.username = results[0].username;
                req.session.user_id = results[0].user_id;
                req.session.cookie.maxAge = expireTime;
                console.log(results[0].user_id);

                res.redirect('/todo');

            } else {
                res.render("errorMessage", {
                    error: "Failed to create user."
                });
            }

        }
    }

});

app.get('/user/:id', async (req, res) => {
    var id = req.params.id;
    adminname = req.session.username;

    var resultList = await db_users.getToDoList({
        user_id: id
    });

    if (resultList) {

        res.render("adminToDo", {
            adminname,
            list: resultList,
            username,
            missing: "none"
        });
    } else {
        res.render("adminToDo", {
            adminname,
            list: "none",
            username,
            missing: "none"
        });
    }

});

app.get('/admin', async (req, res) => {
    username = req.session.username;
    var results = await db_users.getUsers();


    if (!isAdmin(req)) {
        res.redirect("/");
    } else {
        res.render("admin", {
            users: results,
            username
        });
    }


});

app.post('/addToDo', async (req, res) => {
    var user_id = req.session.user_id;
    var username = req.session.username;
    var todo = req.body.todo;
    console.log("add button user_id: " + user_id);

    if (!isValidSession(req)) {
        res.redirect("/");
    } else {
        if (!todo) {
            res.redirect('/todo?missing=todo');

        } else {

            var results = await db_users.addToDo({
                user_id,
                todo
            });

            var resultList = await db_users.getToDoList({
                user_id: req.session.user_id
            });

        }

        if (resultList && results) {

            res.render("todo", {
                list: resultList,
                username,
                missing: "none"
            });
        } else {
            res.render("todo", {
                list: "none",
                username,
                missing: "none"
            });
        }
    }

});

app.post('/loggingin', async (req, res) => {
    var email = req.body.email;
    var password = req.body.password;


    var results = await db_users.getUser({
        email: email,
        hashedPassword: password
    });

    if (results) {
        if (results.length == 1) { //there should only be 1 user in the db that matches
            if (bcrypt.compareSync(password, results[0].hashedPassword)) {
                req.session.authenticated = true;
                req.session.user_type = results[0].user_type;
                req.session.username = results[0].username;
                req.session.user_id = results[0].user_id;
                req.session.cookie.maxAge = expireTime;

                if (!isAdmin(req)) {
                    res.redirect('/todo');
                } else {
                    res.redirect('/admin');
                }

                return;
            } else {
                console.log("invalid password");
            }
        } else {
            console.log('invalid number of users matched: ' + results.length + " (expected 1).");
            res.render("login", {
                error: "User and password not found."
            });
            return;
        }
    }

    console.log('user not found');
    //user and password combination not found
    res.render("login", {
        error: "User and password not found."
    });
});

app.post('/logout', (req, res) => {

    req.session.authenticated = false;
    req.session.destroy();
    res.render("index");

});


function isValidSession(req) {
    if (req.session.authenticated) {
        return true;
    }
    return false;
}

function sessionValidation(req, res, next) {
    if (!isValidSession(req)) {
        req.session.destroy();
        res.redirect('/');
        return;
    } else {
        next();
    }
}

function isAdmin(req) {
    if (req.session.user_type == 'admin') {
        return true;
    }
    return false;
}

function adminAuthorization(req, res, next) {
    if (!isAdmin(req)) {
        res.status(403);
        res.render("errorMessage", {
            error: "Not Authorized"
        });
        return;
    } else {
        next();
    }
}

app.use('/members', sessionValidation);
app.use('/todo', sessionValidation);
app.use('/addToDo', sessionValidation);

app.use('/admin', adminAuthorization);


app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.render("404");
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
});