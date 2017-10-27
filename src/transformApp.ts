import {createServer} from "http";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as compression from "compression";

const session = require("express-session");
const sessionSecret = require("./secrets");
const SqliteStore = require("connect-sqlite3")(session);
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const DigestStrategy = require("passport-http").DigestStrategy;

const debug = require("debug")("ndb:search:server");

import {ServiceOptions} from "./options/serviceOptions";

import {graphQLMiddleware, graphiQLMiddleware} from "./graphql/middleware/graphQLMiddleware";
import {tracingQueryMiddleware} from "./rawquery/tracingQueryMiddleware";

const PORT = process.env.API_PORT || ServiceOptions.serverOptions.port;

passport.use(new LocalStrategy(
    function (username, password, done) {
        //User.findOne({ username: username }, function(err, user) {
        //    if (err) { return done(err); }
        //    if (!user) {
        return done(null, false, {message: 'Incorrect username.'});
        // }
        //    if (!user.validPassword(password)) {
        //        return done(null, false, { message: 'Incorrect password.' });
        //    }
        //    return done(null, user);
        //});
    }
));

passport.use(new DigestStrategy({qop: 'auth'},
    function (username, done) {
        if (username === "mouselight") {
            return done(null, {id: 1, name: username}, "secret");
        } else {
            return done("Invalid user", null);
        }
    },
    function (params, done) {
        // validate nonces as necessary
        done(null, true)
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    done(null, {id: 1, name: "mouselight"});
});

const app = express();

app.use(bodyParser.urlencoded({extended: true}));

app.use(bodyParser.json());

// app.use(compression);

app.use(session({
    store: new SqliteStore,
    secret: sessionSecret,
    cookie: {maxAge: 86400},
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());

app.use(passport.session());

app.use("/tracings", tracingQueryMiddleware);

app.use(ServiceOptions.serverOptions.graphQlEndpoint, /*passport.authenticate('digest', {session: false}),*/ graphQLMiddleware());

if (process.env.NODE_ENV !== "production") {
    app.use(["/", ServiceOptions.serverOptions.graphiQlEndpoint], /*passport.authenticate('digest', {session: false}),*/ graphiQLMiddleware(ServiceOptions.serverOptions));
}

const server = createServer(app);

server.listen(PORT, () => {
    debug(`search api server is now running with env ${ServiceOptions.envName} on http://localhost:${PORT}`);
});
