
if (Meteor.isClient) {
  ;(function (){
    Meteor.call('getNodes', callback)
    function callback(error, data) {
      Session.set("nodes", data)
    }
  })()

  Template.nodes.helpers({
    nodes: function () {
      return Session.get('nodes')
    }
  })
}

if (Meteor.isServer) {
  var db = new Neo4jDB(
    'http://localhost:7474'
  , { username: 'neo4j', password: '1234'}
  )

  var nodesCursor = db.query(
    'MERGE ' +
    '(hello {name:"Hello"})-[link:LINK]->(world {name: "World"}) ' +
    'RETURN hello, link, world'
  )

  Meteor.startup(function () {
    Meteor.methods({
      getNodes: function () {
        nodes = nodesCursor.fetch()
        return nodes
      }
    })
  })
}