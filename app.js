
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
  , { username: 'neo4j', password: '1234' }
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
        // [ { hello: {
        //       _service: {
        //         paged_traverse: [Object],
        //         outgoing_relationships: [Object],
        //         outgoing_typed_relationships: [Object],
        //         create_relationship: [Object],
        //         labels: [Object],
        //         traverse: [Object],
        //         all_relationships: [Object],
        //         all_typed_relationships: [Object],
        //         property: [Object],
        //         self: [Object],
        //         incoming_relationships: [Object],
        //         properties: [Object],
        //         incoming_typed_relationships: [Object]
        //        },
        //      name: 'Hello',
        //      id: 6,
        //      labels: [],
        //      metadata: [Object] },
        //   link: {
        //      _service: [Object],
        //      id: 1,
        //      type: 'LINK',
        //      metadata: [Object],
        //      start: '6',
        //      end: '42'
        //    },
        // , ... }
        // , ... ]
        // 
        // NOTE: The _service property contains circular references.
        // Many of its sub-properties are objects with a _db property
        // which in turn has a _service property.
        // As a result, it cannot be stringified as it is: the _db
        // sub-properties need to be dropped.
        
        var filter = {_service: {filter: {}, drop: ["paged_traverse", "outgoing_relationships", "outgoing_typed_relationships", "create_relationship", "labels", "traverse", "all_relationships", "all_typed_relationships", "property", "self", "incoming_relationships", "properties", "incoming_typed_relationships"]}}
        var nodes = []
        var ids = []
        var keys
          , node

        nodesArray.forEach(function (object) { // , index, array) {
          keys = Object.keys(object)
          for (var ii=0, key; key=keys[ii]; ii++) {
            node = object[key]
            if (node.labels instanceof Array) {
              if (ids.indexOf(node.id) < 0) {
                // This node is not in the nodes array yet. Add it.
                node = clone(node, filter, [])
                nodes.push(node)
                ids.push(node.id)
              }
            }
          }
        })

        console.log(nodes)
        //console.log(JSON.stringify(nodes))
        return nodes

        function clone(node, filter, drop) {
          drop.push("_db")
          var copy = {}
          var keys = Object.keys(node)
          var special = Object.keys(filter)
          var subFilter
            , subDrop
          
          keys.forEach(function (key, index, array){
            console.log("******")
            if (drop.indexOf(key) < 0){
              if (special.indexOf(key) < 0) {
                // Standard treatment
                console.log(key, node[key])
                copy[key] = node[key]
              } else {
                // Special treatment
                subFilter = filter[key]
                subDrop = subFilter.drop || []
                subFilter = subFilter.filter || {}
                copy[key] = clone(node[key], subFilter, subDrop)
              }
            } else { 
              // Drop this key
              // try {
              //   json = JSON.stringify(node[key])
              // } catch(error) {
              //   return clone(node[key], {}, [])
              // }
              // console.log("drop", key, json)
            }
          })

          return copy
        }
      }
    })
  })
}