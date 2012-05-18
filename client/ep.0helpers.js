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
EtherPlan.DATEFORMAT = "YYYY-MM-DD";

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
            // return/enter = ok/submit if non-empty
            var value = String(evt.target.value || "");
            if (value) ok.call(this, value, evt);
            else cancel.call(this, evt);
        }
    };
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

EtherPlan.Helper.validate_move_part = function(oldOrder,newOrder) {
    if (newOrder <= 0) {
        //console.log("not moved, new order must be > 0");
        return false;        
    } 
    
    if (newOrder >= EtherPlan.Helper.size_doc()) {
        //console.log("not moved, new order must be < document size");
        return false;        
    }

    var part = EtherPlan.Parts.findOne({order: oldOrder});
    var size = EtherPlan.Helper.size_tree(part._id);
    
    if (newOrder <= oldOrder+size && newOrder >= oldOrder) {
        //console.log("not moved to same location")
        return false;
    }
    return true;
}

EtherPlan.Helper.move_part = function(oldOrder,newOrder) {
    var part = EtherPlan.Parts.findOne({order: oldOrder});
    var size = EtherPlan.Helper.size_tree(part._id);
    
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

EtherPlan.Helper.add_working_days = function(start,days) {
    var stop = days;
    var counted = 0;
    var candidate = start;

    while(counted<(stop-1)) {
        candidate = candidate.add(1,'days');
        if (EtherPlan.Helper.is_working_day(candidate)) {
            counted++;
        }
    }
    return candidate;
}

EtherPlan.Helper.format_date = function(date) {
    var formatedDate = moment(date).format(EtherPlan.DATEFORMAT);
    return formatedDate;
}

EtherPlan.Helper.update_finish = function(value,start,finish) {
    var days = parseInt(value.value);
    var start = Date.parseFormat(start.value,EtherPlan.DATEFORMAT);
    var add = EtherPlan.Helper.add_working_days(start,days);
    finish.value = EtherPlan.Helper.format_date(add);
}

EtherPlan.Helper.update_value = function(value,start,finish) {
    var sDate = Date.parseFormat(start.value,EtherPlan.DATEFORMAT);
    var fDate = Date.parseFormat(finish.value,EtherPlan.DATEFORMAT);

    value.value = sDate.diff(fDate, 'businessdays')+1;
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

// from: http://stackoverflow.com/questions/2808184/restricting-input-to-textbox-allowing-only-numbers-and-decimal-point
EtherPlan.Helper.is_number_key = function(evt) {
    var charCode = (evt.which) ? evt.which : event.keyCode
    if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57))
        return false;
    return true;
}

// from: http://stackoverflow.com/questions/613114/little-x-in-textfield-input-on-the-iphone-in-mobilesafari
EtherPlan.Helper.clear_input = function(id) {
    $("#" + id).get(0).value="";
    return false;
}

// from: http://code.google.com/p/tesis-e/source/browse/trunk/vocab-editor/static/js/snippets.js
EtherPlan.Helper.topological_sort = function(edges, nodes) {
    var L = [];
    var S = [];

    var hasIncomming = function(edges, node) {
        for (var j = 0; j < edges.length; j++) {
            if (edges[j].to == node) {
                return true;
            }
        }
        return false;
    }

    var removeFromTo = function(edges, from, to) {
        for (var j = 0; j < edges.length; j++) {
            var e = edges[j];
            if (e.from == from && e.to == to) {
                edges.splice(j, 1);;
            }
        }
    }

    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!hasIncomming(edges, node)) {
            S.push(node);
        }
    }

    while (S.length) {
        var n = S.pop();
        L.push(n);
        var edgesFromN = [];
        for (var j = 0; j < edges.length; j++) {
            var e = edges[j];
            if (e.from == n) {
                edgesFromN.push(e);
            }
        }
        while (edgesFromN.length) {
            var m = edgesFromN.pop().to;
            removeFromTo(edges, n, m);
            if (!hasIncomming(edges, m)) {
                S.push(m);
            }
        }
    }
    //console.log(edges);
    return L;
}
// end from: http://code.google.com/p/tesis-e/source/browse/trunk/vocab-editor/static/js/snippets.js 

EtherPlan.Helper.update_values = function () {
    var edges = [];
    var nodes = [];
    var labels = [];
    var groups = [];
    var childs = [];
    var preds = [];


    // first find groups edges and fill nodes, labels, groups and childs arrays
    EtherPlan.Parts.find({doc: Session.get('doc')}).forEach(function (part) {
        if (part.isGroup) {
            groups[part._id] = {start: "",finish:""};
        }
        labels[part._id] = part.label;
        nodes.push(part._id);
        if (part.parent) {
            edges.push({from: part._id, to: part.parent});

            if (!childs[part.parent]) {
                childs[part.parent] = [];
            }
            childs[part.parent].push(part._id);
        } 
    });

    // recursive call to fill predecessors to childs
    var fill_preds = function(part,predecessors) {
        var arrChilds = childs[part._id];
        for (var k in arrChilds) {
            var childId = arrChilds[k];
            var childPart = EtherPlan.Helper.get_part(childId);

            if (childPart.isGroup) {
                fill_preds(childPart,predecessors);
            } else {
                edges.push({to: childId, from: predecessors});
                if (!preds[childId]) {
                    preds[childId] = [];
                }
                preds[childId].push(predecessors);
                console.log("** add pred: " + labels[childId] + " ///to\\\\\\ " + labels[predecessors]);
            }
        }
    }

    // second find predecessors edges, fill preds array
    // if is group then every child have edge with predecessor
    EtherPlan.Parts.find({doc: Session.get('doc')}).forEach(function (part) {
        if (part.predecessors) {
            if (part.isGroup) {
                fill_preds(part,part.predecessors);
            } else  {
                edges.push({to: part._id, from: part.predecessors});
                console.log("** has pred: " + labels[part._id] + " ///to\\\\\\ " + labels[part.predecessors]);
                if (!preds[part._id]) {
                    preds[part._id] = [];
                }
                preds[part._id].push(part.predecessors);
            }
        }   
    });

    // sort using topological sorting
    var list = EtherPlan.Helper.topological_sort(edges,nodes);
    
    // change start and finish
    for (var n=0;n<list.length;n++) {
        console.log("Topological sort: " + labels[list[n]]);

        var part = EtherPlan.Helper.get_part(list[n]);
        var parent = part.parent;

        var tPart = part;

        // predecessors move start and finish dates
        if (preds[part._id]) {
            var dateStartP = Date.parseFormat(part.start,EtherPlan.DATEFORMAT);
            var arrPreds = preds[part._id];
            for (var k in arrPreds) {
                console.log("Compare dates " + labels[part._id] + " using preds " + labels[arrPreds[k]]);

                var d = EtherPlan.Helper.get_part(arrPreds[k]);
                var dateFinishD = Date.parseFormat(d.finish,EtherPlan.DATEFORMAT);
                if (d.isGroup) {
                    dateFinishD = Date.parseFormat(groups[arrPreds[k]].finish,EtherPlan.DATEFORMAT);
                }
                
                if (dateFinishD > dateStartP) {
                    dateStartP = dateFinishD;

                    var add = EtherPlan.Helper.add_working_days(dateStartP,part.value);
                    var newStart = EtherPlan.Helper.format_date(dateStartP);
                    var newFinish = EtherPlan.Helper.format_date(add);
                    EtherPlan.Helper.set_part_value(part._id,"start",newStart);
                    EtherPlan.Helper.set_part_value(part._id,"finish",newFinish);
                    console.log("* Change dates " + labels[part._id] + " using preds " + labels[arrPreds[k]]);

                    tPart = {start: newStart, finish: newFinish};
                }
            }
        }

        // parent is calculated using childs dates
        if (parent) {
            var gParent = groups[parent];
            if (part.isGroup) {
                tPart = groups[part._id];
            }

            var dateStartPart = Date.parseFormat(tPart.start,EtherPlan.DATEFORMAT);
            var dateStartParent = Date.parseFormat(gParent.start,EtherPlan.DATEFORMAT);;

            var dateFinishPart = Date.parseFormat(tPart.finish,EtherPlan.DATEFORMAT);;
            var dateFinishParent = Date.parseFormat(gParent.finish,EtherPlan.DATEFORMAT);;

            if (!dateStartParent || dateStartPart < dateStartParent) {
                console.log("DATES START: " + labels[parent] + "->" + tPart.start + " " + gParent.start);
                gParent.start = tPart.start;
            }

            if (!dateFinishParent || dateFinishPart > dateFinishParent) {
                console.log("DATES FINISH: " + labels[parent] + "->"  + tPart.finish + " " + gParent.finish);
                gParent.finish = tPart.finish;
            }
        }
    }

    for (var k in groups) {
        var g = groups[k];
        var sDate = Date.parseFormat(g.start,EtherPlan.DATEFORMAT);
        var fDate = Date.parseFormat(g.finish,EtherPlan.DATEFORMAT);
        var newValue = sDate.diff(fDate, 'businessdays')+1;

        EtherPlan.Helper.set_part_value(k,"start",g.start);
        EtherPlan.Helper.set_part_value(k,"finish",g.finish);
        EtherPlan.Helper.set_part_value(k,"value",newValue);
    }
}