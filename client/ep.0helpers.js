EtherPlan = {};
EtherPlan.Parts = new Meteor.Collection('parts');

Meteor.autosubscribe(function () {
  var doc = Session.get('doc');
  if (doc)
    Meteor.subscribe('parts', doc);
});

EtherPlan.Helper = {};
EtherPlan.Action = {};

EtherPlan.ENTER_KEY = 13;
EtherPlan.LEVELSPACE = 4;

Session.set('editing_part', null);
Session.set('adding_part', null);
Session.set('adding_brother_part', null);
Session.set('doc', null);
Session.set('show_options', false);
Session.set('show_debug', false);


// from meteor samples
EtherPlan.Helper.okcancel_events = function (selector) {
    return 'keyup ' + selector + ', keydown ' + selector;
};

// from meteor samples
EtherPlan.Helper.make_okcancel_handler = function (options) {
    var ok = options.ok ||
    function () {};
    var cancel = options.cancel ||
    function () {};

    return function (evt) {
        if (evt.type === "keydown" && evt.which === 27) {
            // escape = cancel
            cancel.call(this, evt);

        } else if (evt.type === "keyup" && evt.which === 13) {
            // breturn/enter = ok/submit if non-empty
            var value = String(evt.target.value || "");
            if (value) ok.call(this, value, evt);
            else cancel.call(this, evt);
        }
    };
};

// from meteor samples
EtherPlan.Helper.focus_field_by_id = function (id) {
    var input = document.getElementById(id);
    if (input) {
        input.focus();
        input.select(false);
    }
};

// from http://befused.com/javascript/get-filename-url
EtherPlan.Helper.get_doc = function () {
    var url = window.location.pathname;
    return url.substring(url.lastIndexOf('/')+1);
}

EtherPlan.Helper.find_last_leaf = function (objParent) {
    if (objParent.isGroup) {
        var objLast
        EtherPlan.Parts.find({
            doc: Session.get('doc'),
            parent: objParent._id
        }, {
            sort: {
                order: 1
            }
        }).forEach(function (part) {
            objLast = part;
        });
        if (objLast.isGroup) {
            return EtherPlan.Helper.find_last_leaf(objLast);
        } else {
            return objLast;
        }

    } else {
        return objParent;
    }
}

EtherPlan.Helper.update_values = function () {
    var h = {};
    var old = {};

    // save old values and reset
    EtherPlan.Parts.find({doc: Session.get('doc')}).forEach(function (part) {
        if (part.isGroup) {
            old[part._id] = part.value;
            h[part._id] = 0;
        }
    });

    // add all leaf
    EtherPlan.Parts.find({doc: Session.get('doc')}).forEach(function (part) {
        if (!part.isGroup && part.parent) {
            h[part.parent] += part.value;
        }
    });

    // reverse add all branches
    EtherPlan.Parts.find({doc: Session.get('doc')}, {
        sort: {
            order: -1
        }
    }).forEach(function (part) {
        if (part.isGroup && part.parent) {
            h[part.parent] += h[part._id];
        }
    });

    // update only changed values
    for (var k in h) {
        if (h[k] != old[k]) {
            EtherPlan.Helper.set_part_value(k,"value",h[k]);
        }
    }
}

EtherPlan.Helper.update_orders = function () {
    var h = {};
    var old = {};
    var count = 0;

    // save old order
    EtherPlan.Parts.find({doc: Session.get('doc')},{sort: {order:1}}).forEach(function (part) {
        old[part._id] = part.order;
        h[part._id] = count++;
    });

    // update only changed order
    for (var k in h) {
        if (h[k] != old[k]) {
            EtherPlan.Helper.set_part_value(k,"order",h[k]);
        }
    }
}

EtherPlan.Helper.remove_childs = function (objParent) {
    if (objParent.isGroup) {
        EtherPlan.Parts.find({
            doc: Session.get('doc'),
            parent: objParent._id
        }, {
            sort: {
                order: 1
            }
        }).forEach(function (part) {
            if (part.isGroup) {
                EtherPlan.Helper.remove_childs(part);
            } else {
                EtherPlan.Helper.delete_part(part._id);
            }
        });
    }
    EtherPlan.Helper.delete_part(objParent._id);
}

EtherPlan.Helper.has_childs = function (partId) {
    var count = EtherPlan.Parts.find({
            doc: Session.get('doc'),
            parent: partId
        }).count();
    if (count>0) {
        return true;
    } else {
        return false;
    }
}

EtherPlan.Helper.update_level_childs = function (objParent,val) {
    if (objParent.isGroup) {
        EtherPlan.Parts.find({
            doc: Session.get('doc'),
            parent: objParent._id
        }, {
            sort: {
                order: 1
            }
        }).forEach(function (part) {
            if (part.isGroup) {
                EtherPlan.Helper.update_level_childs(part,val);
            } else {
                EtherPlan.Helper.set_part_value(part._id,"level",(part.level+val));
            }
        });
    }
    EtherPlan.Helper.set_part_value(objParent._id,"level",(objParent.level+val));
}

EtherPlan.Helper.outline_part = function(objPart) {
    var objPrevious = EtherPlan.Parts.findOne({doc: Session.get('doc'), order: (objPart.order-1)});
    var objParent;
    if (objPrevious.level == objPart.level) {
        objParent = objPrevious;
        if (!objParent.isGroup) {
            EtherPlan.Helper.set_part_value(objParent._id,"isGroup",true);
        }
    } 
    else if ( (objPrevious.level == (objPart.level + 1)) && (!objPrevious.isGroup)) {
        objParent = EtherPlan.Parts.findOne(objPrevious.parent);
    } 
    else {
        objParent = EtherPlan.Parts.findOne({doc: Session.get('doc'), level: (objPart.level+1), order: {$lt: objPart.order}}, {order: {order:-1}});
        if (!objParent.isGroup) {
            objParent = EtherPlan.Parts.findOne(objParent.parent);
        }
    }
    EtherPlan.Helper.update_level_childs(objPart,+1);
    EtherPlan.Helper.set_part_value(objPart._id,"parent",objParent._id);
    EtherPlan.Helper.update_values();
}

EtherPlan.Helper.remove_part = function(objPart) {
    var parent = objPart.parent;
    EtherPlan.Helper.remove_childs(EtherPlan.Parts.findOne(objPart._id));
    if (parent) {
        var parentIsGroup = EtherPlan.Helper.get_part(parent).isGroup;
        if (!EtherPlan.Helper.has_childs(parent) && parentIsGroup) {
            EtherPlan.Helper.set_part_value(parent,"isGroup",false);
        }
    }
    EtherPlan.Helper.update_values();
    EtherPlan.Helper.update_orders();
}

EtherPlan.Helper.inline_part = function(objPart) {
    var objParent = EtherPlan.Helper.get_part(objPart.parent);
    var oldParent = objPart.parent;
    var oldOrder = objPart.order;
    EtherPlan.Helper.set_part_value(objPart._id,"parent",objParent.parent);
    EtherPlan.Helper.update_level_childs(objPart,-1);

    if (!EtherPlan.Helper.has_childs(oldParent)) {
        EtherPlan.Helper.set_part_value(oldParent,"isGroup",false);
    } else {
        // move to brother
        var size = EtherPlan.Helper.size_tree(objPart._id);
        var order = EtherPlan.Helper.find_last_leaf(objParent).order;
        var changes = [];
        EtherPlan.Parts.find({doc: Session.get('doc'), order: {$gte: oldOrder, $lte: order}}, {sort: {order: 1}}).forEach(function (part) {
            var newOrder;
            // TODO: review
            if (part.order > (oldOrder+size)) {
                newOrder = part.order-size-1;
            } else {
                newOrder = (order-size) + (part.order-oldOrder);
            }

            changes.push({
                id: part._id,
                newOrder: newOrder
            });
        });
        for (var i = (changes.length - 1); i >= 0; i--) {
            EtherPlan.Helper.set_part_value(changes[i].id,"order",changes[i].newOrder);
        }
    } 

    EtherPlan.Helper.update_values();
}

EtherPlan.Helper.move_part = function(oldOrder,newOrder) {
    
    if (newOrder <= 0) {
        console.log("not moved, new order must be > 0");
        return;        
    } 
    
    if (newOrder >= EtherPlan.Helper.size_doc()) {
        console.log("not moved, new order must be < document size");
        return;        
    }

    var part = EtherPlan.Parts.findOne({order: oldOrder});
    var size = EtherPlan.Helper.size_tree(part._id);
    
    if (newOrder <= oldOrder+size && newOrder >= oldOrder) {
        console.log("not moved to same location")
        return;
    }
    
    var oldParent = part.parent;
    var oldLevel = part.level;    

    var newPart = EtherPlan.Parts.findOne({order: newOrder});
    var nIsGroup = newPart.isGroup;

    // level
    var level = newPart.level;
    var newParent = newPart.parent;

    if (oldOrder < newOrder) {
        if (nIsGroup && !(newPart._id == oldParent)) {
            level++;
            newParent = newPart._id;        
        }
    }
    EtherPlan.Helper.update_level_childs(part,level-oldLevel);

    // order
    // if oldOrder < newOrder then add to part and childs and reduce to rest
    // if oldOrder > newOrder then reduce to part and childs and add to rest
    var changes = [];

    if (oldOrder < newOrder) {
        EtherPlan.Parts.find({doc: Session.get('doc'), order: {$gte: oldOrder, $lte: (oldOrder+size)}}, {sort: {order: 1}}).forEach(function (part) {
            changes.push({id: part._id,order: (newOrder-size) + (part.order-oldOrder)});
        });
        EtherPlan.Parts.find({doc: Session.get('doc'), order: {$gt: (oldOrder+size), $lte: (newOrder)}}, {sort: {order: 1}}).forEach(function (part) {
            changes.push({id: part._id,order: part.order-size-1});
        });
    } else { // oldOrder > newOrder
        EtherPlan.Parts.find({doc: Session.get('doc'), order: {$gte: oldOrder, $lte: (oldOrder+size)}}, {sort: {order: 1}}).forEach(function (part) {
            changes.push({id: part._id,order: newOrder + (part.order-oldOrder)});
        });
        EtherPlan.Parts.find({doc: Session.get('doc'), order: {$gte: newOrder, $lt: oldOrder}}, {sort: {order: 1}}).forEach(function (part) {
            changes.push({id: part._id,order: part.order+size+1});
        });
    }
    for (var i = (changes.length - 1); i >= 0; i--) {
        EtherPlan.Helper.set_part_value(changes[i].id,"order",changes[i].order);
    }

    // parent
    EtherPlan.Helper.set_part_value(part._id,"parent",newParent);
    if (oldParent) {
        var oldParentIsGroup = EtherPlan.Helper.get_part(oldParent).isGroup;
        if (!EtherPlan.Helper.has_childs(oldParent) && oldParentIsGroup) {
            EtherPlan.Helper.set_part_value(oldParent,"isGroup",false);
        }        
    }

    EtherPlan.Helper.update_values();
}


EtherPlan.Helper.size_tree = function (partId) {
    var value = 0;
    var objPart = EtherPlan.Helper.get_part(partId);
    if (objPart.isGroup) {
        EtherPlan.Parts.find({
            doc: Session.get('doc'),
            parent: partId
        }, {
            sort: {
                order: 1
            }
        }).forEach(function (part) {
            if (part.isGroup) {
                value = value + EtherPlan.Helper.size_tree(part._id) + 1;
            } else {
                value++;
            }
        });
    }
    return value;
}

EtherPlan.Helper.size_doc = function (partId) {
    return EtherPlan.Parts.find({doc: Session.get('doc')}).count();
}

EtherPlan.Helper.get_part = function (partId) {
    return EtherPlan.Parts.findOne(partId);
}

EtherPlan.Helper.set_part_value = function(partId,field,value) {
    var obj = {};
    obj[field] = value;
    obj['timestampUpdated'] = (new Date()).getTime();
    // TODO: make more secure
    EtherPlan.Parts.update(partId, {$set: obj});
    //console.log("set value for " + partId + " {" + field + "," + value + "}")
}

EtherPlan.Helper.flush_focus = function(field) {
    //Meteor.flush();
    //EtherPlan.Helper.focus_field_by_id(field);
}


EtherPlan.Helper.delete_part = function(partId) {
    // TODO: make more secure
    EtherPlan.Parts.remove(partId);
    //Meteor.call('deletePart',{_id: partId});
    //Meteor.flush();
}

// from etherpad
EtherPlan.Helper.go_name = function () {
    var planName = document.getElementById("planName").value;
    planName.length > 0 ? window.location = "" + planName : alert("Please enter a name")
}

// from etherpad
EtherPlan.Helper.go_random = function () {
    window.location = "" + EtherPlan.Helper.random_plan_name();
}

// from etherpad
EtherPlan.Helper.random_plan_name = function () {
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var string_length = 10;
    var randomstring = '';
    for (var i = 0; i < string_length; i++) 
    {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}


EtherPlan.Helper.is_working_day = function(date) {
    if(date.getDay() == 6 || date.getDay() == 0){
        return false;
    } else {
        return true;
    }
}


EtherPlan.Helper.update_finish = function(value,start,finish) {
    var stop = parseInt(value.value);
    var counted = 0;
    var candidate = Date.parseFormat(start.value,"YYYY-MM-DD");

    while(counted<(stop-1)) {
        candidate = candidate.add(1,'days');
        if (EtherPlan.Helper.is_working_day(candidate)) {
            counted++;
        }
    }
    finish.value = candidate.dateFormat("YYYY-MM-DD");
}

EtherPlan.Helper.update_value = function(value,start,finish) {
    var sDate = Date.parseFormat(start.value,"YYYY-MM-DD");
    var fDate = Date.parseFormat(finish.value,"YYYY-MM-DD");

    value.value = sDate.diff(fDate, 'businessdays');
}

EtherPlan.Helper.edit_update_finish = function() {
    var value = document.getElementById('editValue');
    var start = document.getElementById('editStart');
    var finish = document.getElementById('editFinish');

    EtherPlan.Helper.update_finish(value,start,finish);
}

EtherPlan.Helper.edit_update_value = function() {
    var value = document.getElementById('editValue');
    var start = document.getElementById('editStart');
    var finish = document.getElementById('editFinish');

    EtherPlan.Helper.update_value(value,start,finish);
}

EtherPlan.Helper.entry_update_finish = function() {
    var value = document.getElementById('entryValue');
    var start = document.getElementById('entryStart');
    var finish = document.getElementById('entryFinish');

    EtherPlan.Helper.update_finish(value,start,finish);
}

EtherPlan.Helper.entry_update_value = function() {
    var value = document.getElementById('entryValue');
    var start = document.getElementById('entryStart');
    var finish = document.getElementById('entryFinish');

    EtherPlan.Helper.update_value(value,start,finish);
}