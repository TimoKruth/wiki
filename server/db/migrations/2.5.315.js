exports.up = knex => {
  return knex.schema.alterTable('userGroups', table => {
    table.string('source').nullable().index()
  })
}

exports.down = knex => {
  return knex.schema.alterTable('userGroups', table => {
    table.dropColumn('source')
  })
}
