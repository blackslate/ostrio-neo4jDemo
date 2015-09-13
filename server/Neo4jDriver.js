
//console.log("Meteor.startup. Neo4jDB is a", typeof Neo4jDB)

// Essential: connect to Neo4j server
db = new Neo4jDB(
  'http://localhost:7474'
, { username: 'neo4j', password: '1234'}
)
//Output in Terminal window:
//v2.2.5            
//<timestamp> Successfully connected to Neo4j on http://localhost:7474

// Optional: check that the database is accessible
cursor = db.query(
  'CREATE ' +
  '(hello {name:"Hello"})-[link:LINK]->(world {props}) ' +
  'RETURN hello, link, world'
, { props: { name: "World" } })
console.log(cursor.fetch())
// Output in Terminal window:
// [ { hello: {}
//       _service: [Object]
//     , name: 'Hello'
//     , id: 3
//     , labels: []
//     , metadata: [Object]
//     }
//  , link: {
//       _service: [Object]
//     , id: 0
//     , type: 'LINK'
//     , metadata: [Object]
//     , start: '3'
//     , end: '5'
//     }
// , world: {
//       _service: [Object]
//     , name: 'World'
//     , id: 5
//     , labels: []
//     , metadata: [Object]
//     }
// } ]
