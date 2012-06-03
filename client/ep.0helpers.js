EtherPlan = {};
EtherPlan.Parts = new Meteor.Collection('parts');

Meteor.autosubscribe(function () {
    var doc = Session.get('doc');
    if (doc) Meteor.subscribe('parts', doc);
});

EtherPlan.Helper = {};
EtherPlan.Action = {};
EtherPlan.Config = {};

EtherPlan.Config.LEVELSPACE = 4;
EtherPlan.Config.DATEFORMAT = "YYYY-MM-DD";
EtherPlan.Config.DEBUG = false;

Session.set('editing_part', null);
Session.set('adding_part', null);
Session.set('adding_brother_part', null);
Session.set('doc', null);
Session.set('show_options', false);
Session.set('show_debug', true);









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









// from: http://stackoverflow.com/questions/2808184/restricting-input-to-textbox-allowing-only-numbers-and-decimal-point
EtherPlan.Helper.is_number_key = function (evt) {
    var charCode = (evt.which) ? evt.which : event.keyCode
    if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) return false;
    return true;
}

// from: http://stackoverflow.com/questions/613114/little-x-in-textfield-input-on-the-iphone-in-mobilesafari
EtherPlan.Helper.clear_input = function (id) {
    $("#" + id).get(0).value = "";
    return false;
}

EtherPlan.Helper.log = function (log) {
    if (EtherPlan.Config.DEBUG) {
        console.log(log);
    }
}









EtherPlan.Helper.is_working_day = function (m) {
    if (m.day() == 6 || m.day() == 0) {
        return false;
    } else {
        return true;
    }
}

EtherPlan.Helper.add_working_days = function (mStart, days) {
    var stop = days;
    var counted = 0;
    var candidate = moment(mStart);

    while (counted < (stop - 1)) {
        candidate = candidate.add('d', 1);
        EtherPlan.Helper.log(candidate);
        if (EtherPlan.Helper.is_working_day(candidate)) {
            EtherPlan.Helper.log("is working day");
            counted++;
        }
    }
    return candidate;
}

EtherPlan.Helper.format_date = function (m) {
    return m.format(EtherPlan.Config.DATEFORMAT);
}

EtherPlan.Helper.parse_date = function (str) {
    return moment(str, EtherPlan.Config.DATEFORMAT);
}

EtherPlan.Helper.diff_dates_working_days = function (strDateStart, strDateFinish) {
    mStart = moment(strDateStart, EtherPlan.Config.DATEFORMAT);
    mFinish = moment(strDateFinish, EtherPlan.Config.DATEFORMAT);

    var count = 1;
    var mTemp = moment(mStart);
    mTemp.add('d', 1);

    while (mTemp <= mFinish) {
        if (EtherPlan.Helper.is_working_day(mTemp)) {
            count++;
        }
        mTemp.add('d', 1);
    }
    return count;
}









EtherPlan.Helper.get_part_id_by_order = function (order) {
    if (order) {
        var part = EtherPlan.Parts.findOne({
            doc: Session.get('doc'),
            order: parseInt(order)
        });
        if (part) {
            return part._id;
        } else {
            EtherPlan.Helper.log("not find part order " + order);
        }
    } else {
        EtherPlan.Helper.log("need order");
    }
    return undefined;
}

EtherPlan.Helper.get_depend = function (predecessors) {
    if (predecessors) {
        var partDepend = EtherPlan.Helper.get_part(predecessors);
        if (partDepend) {
            return partDepend.order;
        } else {
            EtherPlan.Helper.log("Couldn't find predecessors" + predecessors + " for " + part._id);
        }
    }
    return "";
}

EtherPlan.Helper.size_doc = function (partId) {
    return EtherPlan.Parts.find({
        doc: Session.get('doc')
    }).count();
}

EtherPlan.Helper.get_part = function (partId) {
    return EtherPlan.Parts.findOne(partId);
}

EtherPlan.Helper.set_part_value = function (partId, field, value) {
    var obj = {};
    obj[field] = value;
    obj['timestampUpdated'] = (new Date()).getTime();
    // TODO: make more secure
    EtherPlan.Parts.update(partId, {
        $set: obj
    });
    EtherPlan.Helper.log("set value for " + partId + " {" + field + "," + value + "}")
}

EtherPlan.Helper.delete_part = function (partId) {
    // TODO: make more secure
    //Meteor.call('deletePart',{_id: partId});
    //Meteor.flush();


    // first remove from predecessors field
    EtherPlan.Parts.find({
        doc: Session.get('doc'),
        predecessors: partId
    }).forEach(function (part) {
        EtherPlan.Helper.log("remove predecessor: " + part._id);
        EtherPlan.Helper.set_part_value(part._id,"predecessors","");
    });
    EtherPlan.Parts.remove(partId);

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
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}

// from http://befused.com/javascript/get-filename-url
EtherPlan.Helper.get_doc = function () {
    var url = window.location.pathname;
    return url.substring(url.lastIndexOf('/') + 1);
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

EtherPlan.Helper.has_childs = function (partId) {
    var count = EtherPlan.Parts.find({
        doc: Session.get('doc'),
        parent: partId
    }).count();
    if (count > 0) {
        return true;
    } else {
        return false;
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









EtherPlan.Helper.update_finish = function (value, start, finish) {
    var days = parseInt(value.value);
    var start = EtherPlan.Helper.parse_date(start.value);
    var add = EtherPlan.Helper.add_working_days(start, days);
    finish.value = EtherPlan.Helper.format_date(add);
}

EtherPlan.Helper.update_value = function (value, start, finish) {
    value.value = EtherPlan.Helper.diff_dates_working_days(start.value, finish.value);
}

EtherPlan.Helper.edit_update_finish = function () {
    var value = document.getElementById('editValue');
    var start = document.getElementById('editStart');
    var finish = document.getElementById('editFinish');

    EtherPlan.Helper.update_finish(value, start, finish);
}

EtherPlan.Helper.edit_update_value = function () {
    var value = document.getElementById('editValue');
    var start = document.getElementById('editStart');
    var finish = document.getElementById('editFinish');

    EtherPlan.Helper.update_value(value, start, finish);
}

EtherPlan.Helper.entry_update_finish = function () {
    var value = document.getElementById('entryValue');
    var start = document.getElementById('entryStart');
    var finish = document.getElementById('entryFinish');

    EtherPlan.Helper.update_finish(value, start, finish);
}

EtherPlan.Helper.entry_update_value = function () {
    var value = document.getElementById('entryValue');
    var start = document.getElementById('entryStart');
    var finish = document.getElementById('entryFinish');

    EtherPlan.Helper.update_value(value, start, finish);
}
