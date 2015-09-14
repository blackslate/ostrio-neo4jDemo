
var neo4jData = new Meteor.Collection( "neo4jData" )
var subscription = "neo4jData"


if (Meteor.isClient) {
   
  Tracker.autorun( function(){
    console.log("Auto running")
    Meteor.subscribe ( subscription )
    var message = neo4jData.findOne({})
    if ( message ) {
      console.log( message.m )
    }
  })

  ;(function (){
    Meteor.call('getNodes', callback) // or ..., null, callback)
    function callback(error, data) {
      if (!error) {
        Session.set("nodes", data)
      }
    }
  })()

  Template.nodes.helpers({
    nodes: function () {
      return Session.get('nodes')
    }
  , selected: function () {
      return Session.get('selectedNode') || "No nodes selected"
    }
  , selectedData: function () {
      return Session.get('selectedNodeData') || "No data available"
    }
  })
  Template.nodes.events({
    'click select' : function () {
      var $selector = $("#nodes option:selected")
      var name = $selector.text()
      var id = parseInt($selector.val(), 10)
      Session.set("selectedNode", name)
      Meteor.call("getLinksForNode", id, callback)

      function callback (error, data) {
        console.log(error, data)
        if (!error) {
          Session.set("selectedNodeData", data)
        }
      }
    }
  })
}

if (Meteor.isServer) {
  Meteor.publish( subscription, subscribeCallback)

  function subscribeCallback(){
    console.log("subscribeCallback")
    var message = "Hello Client"
    this.added ( subscription, "madeUpId1", { m: message } );
    this.ready();
  }

  var db = new Neo4jDB(
    'http://localhost:7474'
  , { username: 'neo4j', password: '1234'}
  )

  var nodesCursor = db.query(
    'MERGE ' +
    '(hello {name:"Hello"})-[link:LINK]->(world {name: "World"}) ' +
    'RETURN hello, link, world'
  )
  // console.log(nodesCursor)
  // { _cursor: [ { hello: [Object], link: [Object], world: [Object] } ],
  // length: 1,
  // _current: 0,
  // hasNext: false,
  // hasPrevious: false }

  var linksForNodeQuery = 
    'MATCH (node)-[link]->(endpoint) ' +
    'WHERE id(node) = {id} ' +
    'RETURN node, link, endpoint'

  Meteor.startup(function () {
    Meteor.methods({
      getNodes: function () {
        nodesArray = fetchResult(nodesCursor).nodes
        return nodesArray
      }
    , getLinksForNode: function (nodeId) {
        var options = { id: nodeId }
        console.log(linksForNodeQuery, options)

        db.query(linksForNodeQuery, options, callback)
        function callback(error, cursor) {
          console.log(error, cursor)
          // cursor =
          // { _cursor: [ 
          //     { node: [Object]
          //     , link: [Object]
          //     , endpoint: [Object]
          //     }
          //   ]
          // , length: 1
          // , _current: 0
          // , hasNext: false
          // , hasPrevious: false
          // }
          
          if (!error) {
            result = fetchResult(cursor)
// console.log(result)
// { nodes: 
//   [ { name: 'Hello', id: 36, labels: [], metadata: [Object] },
//     { name: 'World', id: 37, labels: [], metadata: [Object] } ],
//   links: 
//   [ { id: 13,
//       type: 'LINK',
//       metadata: [Object],
//       start: '36',
//       end: '37' } ] }
          }
        }
      }
    })
  })

  function fetchResult(cursor) {
    var result = cursor.fetch()
    var nodes = []
    var links = []
    var nodeIds = [] // relationships 
    var keys
      , value
      , array

    result.forEach(function (object) {
      keys = Object.keys(object)
      for (var ii=0, key; key=keys[ii]; ii++) {
       value = object[key]
        if (value.labels instanceof Array) {
          if (nodeIds.indexOf(value.id) < 0) {           
            nodeIds.push(value.id)
          } else {
            return
          }

          array = nodes
        } else {
          array = links
        }
        
        value = cloneWithout_service(value)
        array.push(value)
      }
    })

    return { nodes: nodes, links: links }
 
    function cloneWithout_service(object) {
      var clone = {}
      var keys = Object.keys(object)
      var value
      
      keys.forEach(function (key) { //, index, array){
        // The "_service" object contains REST API URLs and pointers
        // to the server-side db object. It is not needed in the
        // client. Drop it.
        if (key !== "_service") {
          clone[key] = object[key]
        }
      })

      return clone
    }
  }
}