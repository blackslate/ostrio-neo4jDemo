
console.log ("Script loaded")

if (Meteor.isClient) {
  ;(function (){
    Meteor.call('getNodes', callback) // or ..., null, callback)
    function callback(error, data) {
      //console.log(error, data)
      Session.set("nodes", data)
    }
  })()

  Template.nodes.helpers({
    nodes: function () {
      return Session.get('nodes')
    }
  , selected: function () {
      return Session.get('selectedNode') || "No nodes selected"
    }
  })
  Template.nodes.events({
    'click select' : function () {
      var selectedNode = $("#nodes option:selected").text()
      Session.set("selectedNode", selectedNode)
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
        nodesArray = nodesCursor.fetch()

        var nodes = []
        var ids = []
        var keys
          , node

        nodesArray.forEach(function (object) {
          keys = Object.keys(object)
          for (var ii=0, key; key=keys[ii]; ii++) {
           node = object[key]
            if (node.labels instanceof Array) {
              if (ids.indexOf(node.id) < 0) {
                node = clone(node)
                nodes.push(node)
                ids.push(node.id)
              }
            }
          }
        })
        return nodes

        function clone(node) {
          var copy = {}
          var keys = Object.keys(node)
          var value
          
          keys.forEach(function (key, index, array){
            // The "_db" object contains circular references. Drop it.
            if (key !== "_db") {
              value = node[key]

              if (typeof value === "object") {
                // Ensure that the object contains no _db property
                copy[key] = clone(value)
              } else {
                copy[key] = value
              }
            }
          })

          return copy
        }
      }
    })
  })
}