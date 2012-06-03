EtherPlan.Helper.update_orders = function () {
    var h = {};
    var old = {};
    var count = 0;

    // save old order
    EtherPlan.Parts.find({
        doc: Session.get('doc')
    }, {
        sort: {
            order: 1
        }
    }).forEach(function (part) {
        old[part._id] = part.order;
        h[part._id] = count++;
    });

    // update only changed order
    for (var k in h) {
        if (h[k] != old[k]) {
            EtherPlan.Helper.set_part_value(k, "order", h[k]);
        }
    }
}

EtherPlan.Helper.update_level_childs = function (objParent, val) {
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
                EtherPlan.Helper.update_level_childs(part, val);
            } else {
                EtherPlan.Helper.set_part_value(part._id, "level", (part.level + val));
            }
        });
    }
    EtherPlan.Helper.set_part_value(objParent._id, "level", (objParent.level + val));
}

EtherPlan.Helper.outline_part = function (objPart) {
    var objPrevious = EtherPlan.Parts.findOne({
        doc: Session.get('doc'),
        order: (objPart.order - 1)
    });
    var objParent;
    if (objPrevious.level == objPart.level) {
        objParent = objPrevious;
        if (!objParent.isGroup) {
            EtherPlan.Helper.set_part_value(objParent._id, "isGroup", true);
        }
    } else if ((objPrevious.level == (objPart.level + 1)) && (!objPrevious.isGroup)) {
        objParent = EtherPlan.Parts.findOne(objPrevious.parent);
    } else {
        objParent = EtherPlan.Parts.findOne({
            doc: Session.get('doc'),
            level: (objPart.level + 1),
            order: {
                $lt: objPart.order
            }
        }, {
            order: {
                order: -1
            }
        });
        if (!objParent.isGroup) {
            objParent = EtherPlan.Parts.findOne(objParent.parent);
        }
    }
    EtherPlan.Helper.update_level_childs(objPart, +1);
    EtherPlan.Helper.set_part_value(objPart._id, "parent", objParent._id);
    EtherPlan.Helper.update_values();
}

EtherPlan.Helper.inline_part = function (objPart) {
    var objParent = EtherPlan.Helper.get_part(objPart.parent);
    var oldParent = objPart.parent;
    var oldOrder = objPart.order;
    EtherPlan.Helper.set_part_value(objPart._id, "parent", objParent.parent);
    EtherPlan.Helper.update_level_childs(objPart, -1);

    if (!EtherPlan.Helper.has_childs(oldParent)) {
        EtherPlan.Helper.set_part_value(oldParent, "isGroup", false);
    } else {
        // move to brother
        var size = EtherPlan.Helper.size_tree(objPart._id);
        var order = EtherPlan.Helper.find_last_leaf(objParent).order;
        var changes = [];
        EtherPlan.Parts.find({
            doc: Session.get('doc'),
            order: {
                $gte: oldOrder,
                $lte: order
            }
        }, {
            sort: {
                order: 1
            }
        }).forEach(function (part) {
            var newOrder;
            // TODO: review
            if (part.order > (oldOrder + size)) {
                newOrder = part.order - size - 1;
            } else {
                newOrder = (order - size) + (part.order - oldOrder);
            }

            changes.push({
                id: part._id,
                newOrder: newOrder
            });
        });
        for (var i = (changes.length - 1); i >= 0; i--) {
            EtherPlan.Helper.set_part_value(changes[i].id, "order", changes[i].newOrder);
        }
    }

    EtherPlan.Helper.update_values();
}

EtherPlan.Helper.remove_part = function (objPart) {
    var parent = objPart.parent;
    EtherPlan.Helper.remove_childs(EtherPlan.Parts.findOne(objPart._id));
    if (parent) {
        var parentIsGroup = EtherPlan.Helper.get_part(parent).isGroup;
        if (!EtherPlan.Helper.has_childs(parent) && parentIsGroup) {
            EtherPlan.Helper.set_part_value(parent, "isGroup", false);
        }
    }
    EtherPlan.Helper.update_values();
    EtherPlan.Helper.update_orders();
}

EtherPlan.Helper.validate_move_part = function (oldOrder, newOrder) {
    if (newOrder <= 0) {
        EtherPlan.Helper.log("not moved, new order must be > 0");
        return false;
    }

    if (newOrder >= EtherPlan.Helper.size_doc()) {
        EtherPlan.Helper.log("not moved, new order must be < document size");
        return false;
    }

    var part = EtherPlan.Parts.findOne({
        order: oldOrder
    });
    var size = EtherPlan.Helper.size_tree(part._id);

    if (newOrder <= oldOrder + size && newOrder >= oldOrder) {
        EtherPlan.Helper.log("not moved to same location")
        return false;
    }
    return true;
}

EtherPlan.Helper.move_part = function (oldOrder, newOrder) {
    var part = EtherPlan.Parts.findOne({
        order: oldOrder
    });
    var size = EtherPlan.Helper.size_tree(part._id);

    var oldParent = part.parent;
    var oldLevel = part.level;

    var newPart = EtherPlan.Parts.findOne({
        order: newOrder
    });
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
    EtherPlan.Helper.update_level_childs(part, level - oldLevel);

    // order
    // if oldOrder < newOrder then add to part and childs and reduce to rest
    // if oldOrder > newOrder then reduce to part and childs and add to rest
    var changes = [];

    if (oldOrder < newOrder) {
        EtherPlan.Parts.find({
            doc: Session.get('doc'),
            order: {
                $gte: oldOrder,
                $lte: (oldOrder + size)
            }
        }, {
            sort: {
                order: 1
            }
        }).forEach(function (part) {
            changes.push({
                id: part._id,
                order: (newOrder - size) + (part.order - oldOrder)
            });
        });
        EtherPlan.Parts.find({
            doc: Session.get('doc'),
            order: {
                $gt: (oldOrder + size),
                $lte: (newOrder)
            }
        }, {
            sort: {
                order: 1
            }
        }).forEach(function (part) {
            changes.push({
                id: part._id,
                order: part.order - size - 1
            });
        });
    } else { // oldOrder > newOrder
        EtherPlan.Parts.find({
            doc: Session.get('doc'),
            order: {
                $gte: oldOrder,
                $lte: (oldOrder + size)
            }
        }, {
            sort: {
                order: 1
            }
        }).forEach(function (part) {
            changes.push({
                id: part._id,
                order: newOrder + (part.order - oldOrder)
            });
        });
        EtherPlan.Parts.find({
            doc: Session.get('doc'),
            order: {
                $gte: newOrder,
                $lt: oldOrder
            }
        }, {
            sort: {
                order: 1
            }
        }).forEach(function (part) {
            changes.push({
                id: part._id,
                order: part.order + size + 1
            });
        });
    }
    for (var i = (changes.length - 1); i >= 0; i--) {
        EtherPlan.Helper.set_part_value(changes[i].id, "order", changes[i].order);
    }

    // parent
    EtherPlan.Helper.set_part_value(part._id, "parent", newParent);
    if (oldParent) {
        var oldParentIsGroup = EtherPlan.Helper.get_part(oldParent).isGroup;
        if (!EtherPlan.Helper.has_childs(oldParent) && oldParentIsGroup) {
            EtherPlan.Helper.set_part_value(oldParent, "isGroup", false);
        }
    }

    EtherPlan.Helper.update_values();
}

// from: http://code.google.com/p/tesis-e/source/browse/trunk/vocab-editor/static/js/snippets.js
EtherPlan.Helper.topological_sort = function (edges, nodes) {
    var L = [];
    var S = [];

    var hasIncomming = function (edges, node) {
            for (var j = 0; j < edges.length; j++) {
                if (edges[j].to == node) {
                    return true;
                }
            }
            return false;
        }

    var removeFromTo = function (edges, from, to) {
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
    EtherPlan.Helper.log(edges);
    EtherPlan.Helper.log("edges.length: " + edges.length);

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
    EtherPlan.Parts.find({
        doc: Session.get('doc')
    }).forEach(function (part) {
        if (part.isGroup) {
            groups[part._id] = {
                start: "",
                finish: ""
            };
        }
        labels[part._id] = part.label;
        nodes.push(part._id);
        if (part.parent) {
            edges.push({
                from: part._id,
                to: part.parent
            });

            if (!childs[part.parent]) {
                childs[part.parent] = [];
            }
            childs[part.parent].push(part._id);
        }
    });

    // recursive call to fill predecessors to childs
    var fill_preds = function (part, predecessors) {
            var arrChilds = childs[part._id];
            for (var k in arrChilds) {
                var childId = arrChilds[k];
                var childPart = EtherPlan.Helper.get_part(childId);

                if (childPart.isGroup) {
                    fill_preds(childPart, predecessors);
                } else {
                    edges.push({
                        to: childId,
                        from: predecessors
                    });
                    if (!preds[childId]) {
                        preds[childId] = [];
                    }
                    preds[childId].push(predecessors);
                    EtherPlan.Helper.log("** add pred: " + labels[childId] + " ///to\\\\\\ " + labels[predecessors]);
                }
            }
        }

    // second find predecessors edges, fill preds array
    // if is group then every child have edge with predecessor
    EtherPlan.Parts.find({
        doc: Session.get('doc')
    }).forEach(function (part) {
        if (part.predecessors) {
            if (part.isGroup) {
                fill_preds(part, part.predecessors);
            } else {
                edges.push({
                    to: part._id,
                    from: part.predecessors
                });
                EtherPlan.Helper.log("** has pred: " + labels[part._id] + " ///to\\\\\\ " + labels[part.predecessors]);
                if (!preds[part._id]) {
                    preds[part._id] = [];
                }
                preds[part._id].push(part.predecessors);
            }
        }
    });

    // sort using topological sorting
    var list = EtherPlan.Helper.topological_sort(edges, nodes);

    // change start and finish
    for (var n = 0; n < list.length; n++) {
        EtherPlan.Helper.log("Topological sort: " + labels[list[n]]);

        var part = EtherPlan.Helper.get_part(list[n]);
        var tPart = part;
        var parent = part.parent;

        // predecessors move start and finish dates
        if (preds[part._id]) {
            var dateStartP = EtherPlan.Helper.parse_date(part.start);
            var arrPreds = preds[part._id];
            for (var k in arrPreds) {
                EtherPlan.Helper.log("Compare dates " + labels[part._id] + " using preds " + labels[arrPreds[k]]);

                var d = EtherPlan.Helper.get_part(arrPreds[k]);
                var dateFinishD = EtherPlan.Helper.parse_date(d.finish);
                if (d.isGroup) {
                    dateFinishD = EtherPlan.Helper.parse_date(groups[arrPreds[k]].finish);
                }

                var dateNextStartP = EtherPlan.Helper.add_working_days(dateFinishD,2);
                if (dateNextStartP > dateStartP) {

                    dateStartP = dateNextStartP;

                    var add = EtherPlan.Helper.add_working_days(dateNextStartP, part.value);
                    var newStart = EtherPlan.Helper.format_date(dateNextStartP);
                    var newFinish = EtherPlan.Helper.format_date(add);
                    EtherPlan.Helper.set_part_value(part._id, "start", newStart);
                    EtherPlan.Helper.set_part_value(part._id, "finish", newFinish);
                    EtherPlan.Helper.log("* Change dates " + labels[part._id] + " using preds " + labels[arrPreds[k]]);

                    tPart = {
                        start: newStart,
                        finish: newFinish
                    };
                }
            }
        }

        // parent is calculated using childs dates
        if (parent) {
            var gParent = groups[parent];
            if (part.isGroup) {
                tPart = groups[part._id];
            }

            var dateStartPart = EtherPlan.Helper.parse_date(tPart.start);
            var dateStartParent = EtherPlan.Helper.parse_date(gParent.start);

            var dateFinishPart = EtherPlan.Helper.parse_date(tPart.finish);
            var dateFinishParent = EtherPlan.Helper.parse_date(gParent.finish);

            if (!dateStartParent || dateStartPart < dateStartParent) {
                EtherPlan.Helper.log("DATES START: " + labels[parent] + "->" + tPart.start + " " + gParent.start);
                gParent.start = tPart.start;
            }

            if (!dateFinishParent || dateFinishPart > dateFinishParent) {
                EtherPlan.Helper.log("DATES FINISH: " + labels[parent] + "->" + tPart.finish + " " + gParent.finish);
                gParent.finish = tPart.finish;
            }
        }
    }

    for (var k in groups) {
        var g = groups[k];
        var newValue = EtherPlan.Helper.diff_dates_working_days(g.start, g.finish);

        EtherPlan.Helper.set_part_value(k, "start", g.start);
        EtherPlan.Helper.set_part_value(k, "finish", g.finish);
        EtherPlan.Helper.set_part_value(k, "value", newValue);
    }
}
