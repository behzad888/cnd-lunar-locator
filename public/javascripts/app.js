/*
  Lunar Locator app
*/


// init app
var app = app || {};

// Models & Collections
// --------------------------------------------

// Command Center model
app.CommandCenter = Backbone.Model.extend({
  defaults: {
    lat: 0.681400,
    long: 23.460550,
    name: "Command Center",
    model: "",
    power_level_percent: null,
    color: ""
  },
  initialize: function() {
    this.set("coords", {
      lat: this.get("lat"), lng: this.get("long")
    });
  }
});

// Vehicle model
app.VehicleItem = Backbone.Model.extend({
  initialize: function() {
    var power = this.get('power_level_percent');
    if (power > 50) {
      this.set("color", "green");
    } else if (power < 50 && power > 20) {
      this.set("color", "orange");
    } else {
      this.set("color", "red");
    }
    this.set("coords", {
      lat: this.get("lat"), lng: this.get("long")
    });
  }

});

// Vehicle collection
app.VehicleList = Backbone.Collection.extend({
  model: app.VehicleItem,
  url: "/api/vehicles.json"
});



// Views
// --------------------------------------------

// Vehicle item view
app.VehicleItemView = Backbone.View.extend({
  tagName: 'li',
  events: {
    'click [data-event="show-detail"]': 'showDetial'
  },
  initialize: function() {
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
    this.template = _.template($('#vehicle-item-template').html());
  },
  render: function() {
    var renderedContent = this.template(this.model.toJSON());
    this.$el.html(renderedContent);
    return this;
  },
  showDetial: function(event) {
    var $element = $(event.currentTarget);
    $('.app').addClass('show-detail');
    $('.vehicle').removeClass('active');
    $element.addClass('active');
    app.vehicleDetailView.setModel(this.model);
    app.mapView.render();
    app.mapView.addMarker(this.model.get("coords"));
  }

});

// Vehicle detail view
app.VehicleDetailView = Backbone.View.extend({
  tagName: "div",
  attributes: {
    class: "xs-absolute xs-t0 xs-b0 xs-l0 xs-r0"
  },
  initialize: function() {
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
    this.template = _.template($('#vehicle-detail-template').html());
  },
  render: function() {
    var renderedContent = this.template(this.model.toJSON());
    this.$el.html(renderedContent);
    return this;
  },
  setModel: function(model) {
    this.model = model;
    this.render();
  }
});

// Map view
app.MapView = Backbone.View.extend({

  initialize: function() {
    this.markers = [];
    this.render();
  },

  render: function(options) {
    var _this = this;
    this.map = new google.maps.Map(document.getElementById('map'), {
      center: app.cmdCenter.get("coords"),
      zoom: 6,
      streetViewControl: false,
      mapTypeControlOptions: {
        mapTypeIds: ['none']
      }
    });
    var moonMapType = new google.maps.ImageMapType({
      getTileUrl: function(coord, zoom) {
        var normalizedCoord = _this.getNormalizedCoord(coord, zoom);
        if (!normalizedCoord) {
          return null;
        }
        var bound = Math.pow(2, zoom);
        return '//mw1.google.com/mw-planetary/lunar/lunarmaps_v1/clem_bw' +
          '/' + zoom + '/' + normalizedCoord.x + '/' +
          (bound - normalizedCoord.y - 1) + '.jpg';
      },
      tileSize: new google.maps.Size(256, 256),
      maxZoom: 9,
      minZoom: 0,
      radius: 1738000,
      name: 'Moon'
    });

    this.map.mapTypes.set('moon', moonMapType);
    this.map.setMapTypeId('moon');

    // add initial maker to the map
    this.addMarker(app.cmdCenter.get("coords"));

  },
  addMarker: function(position) {
    this.deleteMarkers();
    var marker = new google.maps.Marker({
      position: position,
      map: this.map
    });
    this.map.setCenter(position);
    this.markers.push(marker);
    this.showMarkers();
  },
  setMapOnAll: function(map) {
    for (var i = 0; i < this.markers.length; i++) {
      this.markers[i].setMap(map);
    }
  },
  deleteMarkers: function() {
    this.clearMarkers();
    this.markers = [];
  },
  clearMarkers: function() {
    this.setMapOnAll(null);
  },
  showMarkers: function() {
    this.setMapOnAll(this.map);
  },
  getNormalizedCoord: function(coord, zoom) {
    var y = coord.y;
    var x = coord.x;
    var tileRange = 1 << zoom;

    if (y < 0 || y >= tileRange) {
      return null;
    }

    if (x < 0 || x >= tileRange) {
      x = (x % tileRange + tileRange) % tileRange;
    }

    return {x: x, y: y};
  }
});

// Vehicle collection view
app.VehicleListView = Backbone.View.extend({
  tagName: 'ul',
  attributes: {
    class: 'list-unstyled xs-border-bottom xs-full-height xs-overflow-auto'
  },
  initialize: function() {
    _.bindAll(this, 'render');
    this.collection.bind('reset', this.render);
    this.collection.bind('add', this.render);
  },
  render: function() {
    var $el = this.$el;
    this.collection.each(function(vehicle) {
      var itemView = new app.VehicleItemView({model:vehicle});
      $el.append(itemView.render().el);
    });
  }
});




// Router & App setup
// --------------------------------------------

// App router
app.Router = Backbone.Router.extend({
  routes: {
    "": "index",
    "vehicle/:id": "show"
  },
  show: function (id) {
    var model = app.vehicleList.get(id);
    app.detailView.setModel(model);
  }
});

// Main app view
app.AppView = Backbone.View.extend({
  initialize: function() {

    app.Router = new app.Router();
    Backbone.history.start({pushState: true});

    app.vehicleList = new app.VehicleList();
    app.vehicleListView = new app.VehicleListView({
      collection: app.vehicleList
    });

    app.cmdCenter = new app.CommandCenter();
    app.vehicleDetailView = new app.VehicleDetailView({
      model: app.cmdCenter
    });


    $(".vehicles").append(app.vehicleListView.el);
    $(".vehicle-detail").append(app.vehicleDetailView.render().el);

    app.mapView = new app.MapView();

    app.vehicleList.fetch({reset: true});

    console.log(app.cmdCenter.get("coords"));

  }

});

function initApp() {
  new app.AppView();
}

$(function(){
    $("[data-event='close-detail']").on("click", function() {
      $(".app").removeClass("show-detail");
      $(".vehicle").removeClass("active");
    });
});
