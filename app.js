
if (Meteor.isClient) {
  ;(function (){
    Meteor.call('getNodes', callback) // or ..., null, callback)
    function callback(error, data) {
      if (!error) {
        // Peel off the { node: ... } wrapper
        // [ { node: { name: 'Hello', id: 47, labels: [], metadata: {...} } }, ... ]
        data = data.map(function(object){return object.node})
        // [ { name: 'Hello', id: 47, labels: [], metadata: {...} },
        // ... ]
        Session.set("nodes", data)
        //console.log(data)
      }
    }
  })()

  Template.nodes.helpers({
    nodes: function () {
      return Session.get('nodes')
    }
  })

  Template.nodes.events({
    'click select' : function () {
      var $selector = $("#nodes option:selected")
      var id = parseInt($selector.val(), 10)
      var node = getNodeFromId(id)
      Session.set("selectedNode", node)
      Meteor.call("getLinksForNode", id, callback)

      function callback (error, data) {
        //console.log(error, JSON.stringify(data))
        // { "nodes": [
        //     { "name": "World"
        //     , "id": 48
        //     , "labels": []
        //     , "metadata":{"id":48,"labels":[]}
        //     }
        //   ]
        // , "links": [
        //     { "id": 12
        //     , "type": "LINK"
        //     , "metadata": {"id":12,"type":"LINK"}
        //     , "start": 47
        //     , "end": 48
        //     }
        //   ]
        // }
        
        if (!error) {
          Session.set("selectedNodeData", data)
        }
      }
    }
  })

  Template.selected.helpers({
    selected: function () {
      var node = Session.get('selectedNode')
      return node ? node : { id: "No node selected" }
    }
  , properties: function () {
      var node = Session.get('selectedNode')
      var properties = getPropertiesFor(node, ["id", "metadata"])
      return properties
    }
  })

  Template.selectedData.helpers({
    links: function () { 
      var nodes = []

      var selected = Session.get('selectedNode')
      if (selected) {
        var linkData = Session.get('selectedNodeData')
        if (linkData) {
          var nodeArray = linkData.nodes
          var linkArray = linkData.links

          var properties
            , links
            , id

          if (linkData) {
            nodeArray.forEach(function (node) {
              id = node.id
              properties = getPropertiesFor(node, ["id", "metadata"])
              links = getLinksFor(selected.id, id, linkArray)

              node = { 
                id: id
              , properties: properties
              , links: links
              }

              nodes.push(node)
              //console.log(node)
            })
          }
        }
      }

      //console.log(nodes.length)
      return nodes
    }
  })

  function getNodeFromId(id) {
    var nodes = Session.get("nodes")
    var result = null

    nodes.every(function (node) {
      if (node.id !== id) {
        return true
      } else {
        result = node
        // return false // break the loop
      }
    })

    return result
  }

  function getPropertiesFor(node, ignore) {
    var properties = []
    ignore = (ignore instanceof Array) ? ignore : []

    if (node) {
      var keys = Object.keys(node)
      keys.sort()
      keys.forEach(function (key) {
        if (ignore.indexOf(key) < 0) {
          properties.push({key: key, value: node[key]})
        }
      })
    }

    return properties
  }

  function getLinksFor(source, target, linkArray) {
    // [ { "id":12
    //   , "type": "LINK"
    //   , "metadata" :{"id":12,"type":"LINK"}
    //   , "start": 47
    //   , "end": 48
    // } ]

    var links = []
    var ignore = ["start", "end", "id", "metadata"]

    linkArray.forEach(function (link) {
      if (link.start === source && link.end === target) {
        properties = getPropertiesFor(link, ignore)
        links.push({id: link.id, properties: properties})
      }
    })

    return links
  }
}

if (Meteor.isServer) {
  var db = new Neo4jDB(
    'http://localhost:7474'
  , { username: 'neo4j', password: '1234'}
  )

  var nodesCursor = db.query(
    'MERGE ' +
    '(hello {name: "Hello"})-[:LINK]->(world {name:"World"}) ' +
    'WITH hello ' +
    'MATCH (node) ' +
    'RETURN node ' +
    'LIMIT 10'
  )
  console.log(nodesCursor)
  // { _cursor: [ { hello: [Object], link: [Object], world: [Object] } ],
  // length: 1,
  // _current: 0,
  // hasNext: false,
  // hasPrevious: false }

  var linksForNodeQuery = 
    'MATCH (node)-[link]->(endpoint) ' +
    'WHERE id(node) = {id} ' +
    'RETURN link, endpoint'
  function getQueryResult(request, callback) {
    var query = request.query
    var options = request.options
    db.query(query, options, callback)
  }
  var wrappedQueryResult = Meteor.wrapAsync(getQueryResult)

  Meteor.startup(function () {
    Meteor.methods({
      getNodes: function () {
        //nodesArray = fetchResult(nodesCursor).nodes
        //console.log(nodesCursor)
        nodesArray = nodesCursor.fetch()
        //console.log(nodesArray)
        return nodesArray
      }
    , getLinksForNode: function (nodeId) {
        var options = { id: nodeId }
        var request = { query: linksForNodeQuery, options: options }
        //console.log(request)
        cursor = wrappedQueryResult(request)
        result = fetchResult(cursor)
        //console.log(result)
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