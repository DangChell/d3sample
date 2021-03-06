const { getIntrospectionQuery } = require ('graphql');
const { buildClientSchema } = require ('graphql');
const { buildSchema } = require ('graphql');
const { printSchema } = require ('graphql');
const fs = require('fs');
const path = require('path');
const graphURL = "https://worldcup-graphql.now.sh/";
const fetch = require('node-fetch');

const controller = {};

// Using introspection to retrieve the schema from a given graphQL endpoint, expects graphQL string endpoint in the req.body
// for now, have manually defined the URL as worldcup endpoint in line 5
controller.getSchema = (req, res, next) => {
  // const {graphURL} = req.body;
  fetch(graphURL, {
    method: "Post",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({"query": getIntrospectionQuery()}),
  })
    .then(res => res.json())
    .then(data => {
      res.locals.schema = JSON.stringify(data, null, 2); // put " data cleaning" function in 2nd parameter of stringify
      // Writes and saves the JSON file retrieved from introspection query into root folder
      // fs.writeFileSync(path.resolve(__dirname, "schema.json"), res.locals.schema);
      // Stores the file path for future middleware to access to implement in d3
      // res.locals.path = path.resolve(__dirname, "schema.json");
    })
    .then(() => next());
};

// converts schema into an object of Types and their respective fields (along with references to other Types)
// output is in format e.g.:
/*
{
  Query: [
    'info',
    { teams: 'Team' },
    { players: 'Player' },
    { games: 'Fixture' },
    { fixtures: 'Fixture' }
  ],
  ....
  Result: [ 'goalsHomeTeam', 'goalsAwayTeam' ]
}

*/
controller.convertSchema = (req, res, next) => {
  const sourceSchema = JSON.parse(res.locals.schema);
  const cleanedSchema = cleanSchema(sourceSchema);
  console.log(cleanedSchema);
  return next();
};

function cleanSchema(sourceSchema) {
  const schemaTypes = sourceSchema.data.__schema.types;
  const types = {};
  for (let i = 0; i < schemaTypes.length; i++) {
    //iterate only through relevant types (tables)
    if (schemaTypes[i].fields !== null && schemaTypes[i].name.indexOf('__') === -1){
      const fieldsList = [];
      // Iterate through the fields array of each type (table)
      for (let j = 0; j < schemaTypes[i].fields.length; j++) {
        if (schemaTypes[i].fields[j].name && !schemaTypes[i].fields[j].isDeprecated) {
          // checks if the type of a field references another Type 
          if (schemaTypes[i].fields[j].type.ofType && schemaTypes[i].fields[j].type.ofType.ofType) {
            // creates a key-value pair of relationship between the field name and the type if it points to another type
            const fieldsLink = {};
            fieldsLink[schemaTypes[i].fields[j].name] = schemaTypes[i].fields[j].type.ofType.ofType.name;
            fieldsList.push(fieldsLink);
          } else {
            fieldsList.push(schemaTypes[i].fields[j].name);
          }
       } 
     }
      types[schemaTypes[i].name] = fieldsList;
    }
  }
  return types;
}


module.exports = controller;