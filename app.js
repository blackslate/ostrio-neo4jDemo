
if (Meteor.isClient) {

  Template.asynch.helpers({
    result: function () {
      return Session.get('result') || "No result available"
    }
  })
  Template.asynch.events({
    'click button' : function () {
      Meteor.call("getAsynchResult", callback)

      function callback (error, data) {
        console.log(error, JSON.stringify(data))
        if (!error) {
          Session.set("result", data)
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

  function getQueryResult(request, callback) {
    var query = request.query
    var options = request.options
    db.query(query, options, callback)
  }
  var wrappedQueryResult = Meteor.wrapAsync(getQueryResult)

  Meteor.startup(function () {
    Meteor.methods({
      getAsynchResult: function (nodeId) {
        var options = {}
        var query = 'MATCH (node) RETURN node'
        var request = { query: query, options: options }
        console.log(request)
        var cursor = wrappedQueryResult(request)
        var result = fetchResult(cursor)
        console.log(result)
        return result
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
