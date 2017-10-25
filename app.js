'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();
const Boom = require('boom');
const Knex = require('knex')({
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        user : 'postgres',
        password : 'postgres',
        database : 'postgres'
    }
});

server.method('generate', (options, next) => {

    Knex('users').where({
        email:  options.payload.email
    }).select('role')
        .then((response) => {

            if (response[0].role === 'admin') {

                Knex.schema.hasTable('invite_keys')
                    .then((exists) => {

                        if (!exists) {
                            return Knex.schema.withSchema('public').createTable('invite_keys', (usersTable) => {

                                usersTable.increments();
                                usersTable.string('created_by').notNullable();
                                usersTable.string('invitation_key').notNullable().unique();
                                usersTable.string('status').notNullable();
                                usersTable.string('used_by').unique();
                            }).then();
                        }
                    })
                    .then(() => {

                        let text = '';
                        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

                        for (let i = 0; i < 6; ++i) {
                            text += possible.charAt(Math.floor(Math.random() * possible.length));
                        }

                        const data = {
                            created_by: options.payload.email,
                            invitation_key: text,
                            status: 'unused',
                            used_by: null
                        };

                        Knex.insert( data ).into( 'invite_keys' )
                            .then(() => {

                                const responseData = {
                                    'created_by': options.payload.email,
                                    'invitation_key': text,
                                    'status': 'unused',
                                    'used_by': null
                                };

                                return next(null, responseData);
                            })
                            .catch((error) => {

                                return next(error, null);
                            });
                    });
            };
        });
});


server.method('register', (options, next) => {

    Knex.schema.hasTable('users')
        .then((exists) => {

            if (!exists) {
                return Knex.schema.withSchema('public').createTable('users', (usersTable) => {

                    usersTable.increments();
                    usersTable.string('name').notNullable();
                    usersTable.string('email', 128).notNullable().unique();
                    usersTable.string('password').notNullable();
                    usersTable.string('repassword').notNullable();
                    usersTable.string('role').notNullable();
                    usersTable.string('invitation_key').notNullable().unique();
                    usersTable.string('invited_by').notNullable();
                }).then();
            }
        })
        .then(() => {

            if (options.payload.invitation_key) {
                Knex('invite_keys').where({
                    invitation_key:  options.payload.invitation_key
                }).select('created_by')
                    .then((response) => {

                        if (response.length === 0) {
                            return next(Boom.notFound('Invalid Registration Key'), null);
                        }

                        if (options.payload.password === options.payload.repassword) {
                            options.payload.invited_by = response[0].created_by;

                            Knex.insert( options.payload ).into( 'users' )
                                .then(() => {

                                    Knex('invite_keys')
                                        .where('invitation_key', '=', options.payload.invitation_key)
                                        .update({
                                            status: 'used',
                                            used_by: options.payload.email
                                        })
                                        .then((reponse) => {

                                            return next(null, options.payload);
                                        });
                                })
                                .catch((error) => {

                                    return next(error.detail, null);
                                });
                        }
                        else {
                            return next(Boom.notFound('Passwords does not match'), null);
                        }
                    });
            }
            else {
                return next(Boom.notFound('You must have a invite key to register'), null);
            }
        });
});


server.connection({
    port: '8080'
});


server.route( {

    path: '/register',
    method: 'PUT',
    handler: ( request, reply ) => {

      server.methods.register(request, (err, response) => {

        if (err) {
            reply(err);
            return;
        }

        reply(response).code(200);
      })
    }

} );

server.route( {

    path: '/generate',
    method: 'POST',
    handler: ( request, reply ) => {

        server.methods.generate(request, (err, response) => {

          if (err) {
              reply(err);
              return;
          }

          reply(response).code(200);
        })

    }

} );


server.start((err) => {

    if (err) {
        throw err;
    }
});
