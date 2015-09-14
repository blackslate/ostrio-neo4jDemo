
// console.log ("Script loaded")

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
        console.log(nodesArray[0].hello._service.paged_traverse)

        // [ { hello: {
        //       _service: {
        //         paged_traverse: {
        //           key: 'paged_traverse',
        //           endpoint: 'http://localhost:7474/db/data/node/36/paged/traverse/{returnType}{?pageSize,leaseTime}',
        //           _db: 
        //            { ...,
        //              __service: 
        //               { node: [Object],
        //                 node_index: [Object],
        //                 relationship_index: [Object],
        //                 extensions_info: [Object],
        //                 relationship_types: [Object],
        //                 batch: [Object],
        //                 cypher: [Object],
        //                 indexes: [Object],
        //                 constraints: [Object],
        //                 transaction: [Object],
        //                 node_labels: [Object],
        //                 neo4j_version: [Object]
        //               },
        //              ... }
        //             }
        //           },
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
        // NOTE: The sub-properties of the _service property are 
        // objects with a _db property which in turn has a _service
        // property, which creates a circular reference.
        // As a result, it cannot be stringified as it is: the _db
        // sub-properties first need to be dropped. In any case, the
        // _db object is meaningless in the client.
        
        var nodes = []
        var ids = []
        var keys
          , node

        nodesArray.forEach(function (object) { // , index, array) {
          keys = Object.keys(object)
          for (var ii=0, key; key=keys[ii]; ii++) {
           console.log("**********")
           node = object[key]
            if (node.labels instanceof Array) {
              if (ids.indexOf(node.id) < 0) {
                // This node is not in the nodes array yet. Add it.
                node = clone(node)
                nodes.push(node)
                ids.push(node.id)
              }
            }
          }
        })

        console.log(nodes)
        //console.log(JSON.stringify(nodes))
        return nodes

        function clone(node) {
          var copy = {}
          var keys = Object.keys(node)
          var value
          
          keys.forEach(function (key, index, array){
            if (key !== "_db") {
              value = node[key]

              if (typeof value === "object") {
                // Ensure that the object contains no _db property
                console.log("Dropping the _db object from", key)
                copy[key] = clone(value)
              } else {
                // Standard treatment
                // console.log(key, node[key])
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