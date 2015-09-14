
if (Meteor.isClient) {
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
        console.log(error, JSON.stringify(data))
        if (!error) {
          Session.set("selectedNodeData", data)
        }
      }
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
  console.log(nodesCursor)
  // { _cursor: [ { hello: [Object], link: [Object], world: [Object] } ],
  // length: 1,
  // _current: 0,
  // hasNext: false,
  // hasPrevious: false }

  var linksForNodeQuery = 
    'MATCH path = (node)-[link]->(endpoint) ' +
    'WHERE id(node) = {id} ' +
    'RETURN path'
  function getQueryResult(request, callback) {
    var query = request.query
    var options = request.options
    db.query(query, options, callback)
  }
  var wrappedQueryResult = Meteor.wrapAsync(getQueryResult)

  Meteor.startup(function () {
    Meteor.methods({
      getNodes: function () {
        nodesArray = fetchResult(nodesCursor).nodes
        return nodesArray
      }
    , getLinksForNode: function (nodeId) {
        var options = { id: nodeId }
        var request = { query: linksForNodeQuery, options: options }
        // console.log(request)
        cursor = wrappedQueryResult(request)
        result = fetchResult(cursor)
        return result

        // { "nodes": [ 
        //     { "name": "Hello"
        //     , "id": 36
        //     , "labels": []
        //     , "metadata": {
        //         "id": 36
        //       , "labels":[]
        //       }
        //     }
        //   , { "name": "World"
        //     , "id": 37
        //     , "labels": []
        //     , "metadata": {
        //         "id": 37
        //       , "labels": []
        //       }
        //     }
        //   ]
        // , "links": [
        //     { "id": 13
        //     , "type": "LINK"
        //     , "metadata": {
        //         "id": 13
        //       , "type":"LINK"
        //       }
        //     , "start": "36"
        //     , "end": "37"
        //     }
        //   ]
        // }
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