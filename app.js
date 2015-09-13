
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
  
        console.log("getNodes called")
        // [ { hello: 
        //  { _service: [Object],
        //    name: 'Hello',
        //    id: 6,
        //    labels: [],
        //    metadata: [Object] },
        // link: 
        //  { _service: [Object],
        //    id: 1,
        //    type: 'LINK',
        //    metadata: [Object],
        //    start: '6',
        //    end: '42' },
        // world: 
        //  { _service: [Object],
        //    name: 'World',
        //    id: 42,
        //    labels: [],
        //    metadata: [Object] } }
        // , ... ]
        
        var nodes = []
        var keys
          , name

        nodesArray.forEach(function (object) { // , index, array) {
          keys = Object.keys(object)
          for (var ii=0, key; key=keys[ii]; ii++) {
            name = object[key].name // may be undefined
            if (name) {
              nodes.push({node: name})
              console.log(ii, key, name)
            }
          }
        })

        console.log(nodes)
        return nodes
      }
    })
  })
}