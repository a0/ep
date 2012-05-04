EtherPlan = {};
EtherPlan.Parts = new Meteor.Collection('parts');

Meteor.publish('parts', function (doc) {
  return EtherPlan.Parts.find({doc: doc});
});






/*
// trying to make more secure, result into a lack of synchronization between server and client

EtherPlan.Methods = {};
EtherPlan.Methods.deletePart = function(args) {
  // TODO: make more secure
  if (args._id) {
    EtherPlan.Parts.remove(args._id);
  }
  console.log("Call delete " + args._id)
}

Meteor.methods({
  deletePart: EtherPlan.Methods.deletePart,
});

Meteor.startup(function () {
  _.each(['parts'], function(collection) {
    _.each(['remove'], function(method) {
      Meteor.default_server.method_handlers['/' + collection + '/' + method] = function() {};
    });
  });
});

///////////////////////////////////////////////////////////////////////////////
EtherPlan.Methods = {};
EtherPlan.Methods.deletePart = function(args) {
	// TODO: make more secure
	if (args._id) {
		EtherPlan.Parts.remove(args._id);
	}
	console.log("Call delete " + args._id)
}

EtherPlan.Methods.setPartValue = function(args) {
	// TODO: make more secure
    var obj = {};
    obj[args.field] = args.value;
           
    if (args._id) {
		EtherPlan.Parts.update(args._id, {$set: obj}); 
	}
	console.log("Call update " + args._id + " {" + args.field + "," + args.value + "}")
}

Meteor.methods({
  deletePart: EtherPlan.Methods.deletePart,
  setPartValue: EtherPlan.Methods.setPartValue
});

Meteor.startup(function () {
  _.each(['parts'], function(collection) {
    _.each(['update', 'remove'], function(method) {
      Meteor.default_server.method_handlers['/' + collection + '/' + method] = function() {};
      //console.log(Meteor.default_server.method_handlers['/' + collection + '/' + method].toString());
    });
  });
});
*/