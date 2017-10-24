'use strict';

const Boom = require('boom');

module.exports = function (Knex, options, next) {

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
};
