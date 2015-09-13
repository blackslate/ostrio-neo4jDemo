

console.log ("Script loaded")

if (Meteor.isClient) {
  Template.simple.helpers({
    result: function () {
      return Session.get('serverSimpleResponse') || ""
    }
  })
  Template.simple.events({
    'click input' : function () {
      Meteor.call('getCurrentTime',function(err, response) {
        Session.set('serverSimpleResponse', response)
      })
    }
  })

  Template.passData.helpers({
    result: function () {
      return Session.get('serverDataResponse') || ""
    }
  })
  Template.passData.events({
    'click input[type=button]' : function () {
      Meteor.call('welcome', $('input[type=text]').val(), function(err,response) {
        if(err) {
          Session.set('serverDataResponse', "Error:" + err.reason)
          return
        }
        Session.set('serverDataResponse', response)
      })
    }
  })
}

if (Meteor.isServer) {
  Meteor.startup(function () {
  Meteor.methods({
    getCurrentTime: function () {
      console.log('on server, getCurrentTime called')
      return new Date()
    },

    welcome: function (name) {
      console.log('on server, welcome called with name: ', name)
      if(name==undefined || name.length<=0) {
          throw new Meteor.Error(404, "Please enter your name")
      }
        return "Welcome " + name
      }
    })
  })
}