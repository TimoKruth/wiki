exports.up = async knex => {
  await knex.schema
    .alterTable('pages', table => {
      table.json('tocOptions').nullable()
    })
  await knex('pages').whereNull('tocOptions').update({
    tocOptions: JSON.stringify({
      min: 1,
      max: 2,
      useDefault: true
    })
  })
}

exports.down = knex => { }
