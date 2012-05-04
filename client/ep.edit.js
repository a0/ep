EtherPlan.Action.editSend = function (text, evt) {
    var label = document.getElementById('editLabel');
    var value = document.getElementById('editValue');
    var start = document.getElementById('editStart');
    var finish = document.getElementById('editFinish');
    var predecessors = document.getElementById('editPredecessors');

    if (this.label != label.value) {
        EtherPlan.Helper.set_part_value(this._id,"label",label.value);
    }
    if (this.value != parseInt(value.value)) {
        EtherPlan.Helper.set_part_value(this._id,"value",parseInt(value.value));
        EtherPlan.Helper.update_values();
    }
    if (this.start != start.value) {
        EtherPlan.Helper.set_part_value(this._id,"start",start.value);
    }
    if (this.finish != start.finish) {
        EtherPlan.Helper.set_part_value(this._id,"finish",finish.value);
    }
    if (this.predecessors != predecessors.value) {
        EtherPlan.Helper.set_part_value(this._id,"predecessors",predecessors.value);
    }

    Session.set('editing_part', null);
    if (evt) {
        evt.target.value = '';
    }
}

EtherPlan.Action.editCancel = function () {
    Session.set('editing_part', null);
}

EtherPlan.Action.inline = function () {
    EtherPlan.Helper.inline_part(this);
}

EtherPlan.Action.outline = function () {
    EtherPlan.Helper.outline_part(this);
}

EtherPlan.Action.remove = function () {
    EtherPlan.Helper.remove_part(this);
    Session.set('editing_part', null);
}

EtherPlan.Action.addChild = function () {
    Session.set('editing_part', null);
    Session.set('adding_part', this._id);
    Meteor.flush();
    EtherPlan.Helper.focus_field_by_id("entryLabel");
}

EtherPlan.Action.addBrother = function () {
    Session.set('editing_part', null);
    Session.set('adding_brother_part', this._id);
    Meteor.flush();
    EtherPlan.Helper.focus_field_by_id("entryLabel");
}

EtherPlan.Action.up = function () {
    EtherPlan.Helper.move_part(this.order,this.order-1);
}

EtherPlan.Action.down = function () {
    EtherPlan.Helper.move_part(this.order,this.order+EtherPlan.Helper.size_tree(this._id)+1);
}

EtherPlan.Action.moveTo = function () {
    var newOrder = parseInt(document.getElementById('newOrder').value);
    EtherPlan.Helper.move_part(this.order,newOrder);
    Session.set('editing_part', null);
}

EtherPlan.Action.showOptions = function () {
    Session.set('show_options', true);
}

EtherPlan.Action.hideOptions = function () {
    Session.set('show_options', false);
}

EtherPlan.Action.showDebug = function () {
    Session.set('show_debug', true);
}

EtherPlan.Action.hideDebug = function () {
    Session.set('show_debug', false);
}

Template.edit.events = {
    'click #editSend': EtherPlan.Action.editSend,
    'click #editCancel': EtherPlan.Action.editCancel,
    'click #moveInline': EtherPlan.Action.inline,
    'click #moveOutline': EtherPlan.Action.outline,
    'click #moveTo': EtherPlan.Action.moveTo,
    'click #moveUp': EtherPlan.Action.up,
    'click #moveDown': EtherPlan.Action.down,
    'click #remove': EtherPlan.Action.remove,
    'click #addChild': EtherPlan.Action.addChild,
    'click #addBrother': EtherPlan.Action.addBrother,
    'click #showOptions': EtherPlan.Action.showOptions,
    'click #hideOptions': EtherPlan.Action.hideOptions,
    'click #showDebug': EtherPlan.Action.showDebug,
    'click #hideDebug': EtherPlan.Action.hideDebug,
};

Template.edit.events[EtherPlan.Helper.okcancel_events('')] = EtherPlan.Helper.make_okcancel_handler({
    ok: EtherPlan.Action.editSend,
    cancel: EtherPlan.Action.editCancel
});

Template.edit.hasParent = function () {
    return (this.parent != undefined);
};

Template.edit.couldOutline = function () {
    if (this.level == 0) {
        return false;
    } else {
        var objPrevious = EtherPlan.Parts.findOne({doc: Session.get('doc'), order: (this.order-1)});
        if (objPrevious.level >= this.level ) {
            return true;
        } else {
            return false;
        }
    } 
};

Template.edit.couldInline = function () {
    if (this.level <= 1) {
        return false;
    } else {
        return true;
    }
};

Template.edit.couldDown = function () {
    if ( this.order == 0 || (this.order + EtherPlan.Helper.size_tree(this._id)) == EtherPlan.Helper.size_doc()-1 ) {
        return false;
    } else {
        return true;
    }
};

Template.edit.couldUp = function () {
    if (this.order <= 1) {
        return false;
    } else {
        return true;
    }
};

Template.edit.couldPredecessors = function () {
    if (this.order < 1) {
        return false;
    } else {
        return true;
    }
};

Template.edit.couldMoveTo = function () {
    if (this.order < 1) {
        return false;
    } else {
        return true;
    }
};

Template.edit.showDebug = function () {
    return Session.get("show_debug");
};

Template.edit.showOptions = function () {
    return Session.get("show_options");
};
