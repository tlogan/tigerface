'use strict';

$(function() {

  var $content = $("#content");
  var state = mkState();

  common.get('token', {}, function(result) {
    console.log("you are not already logged in: " + JSON.stringify(result));
    state.update('token', result.token);
  });

  function renderStartView() {
    $content.html(view.div({id: 'start_section'}).append(
      view.div().html(view.mkLogInDiv(function(result) {
        state.update('token', result.token);
      })),
      view.div().html(view.mkSignUpDiv(function(result) {
        console.log("just created new user: " + JSON.stringify(result));
        state.update('token', result.token);
      }))
    ));
  }

  function renderHomeView(user) {
    $content.append(
      view.mkFrame(
        user.username,
        function() {
          var $p = common.post('logout');
          $p.then(function() {
            state.update('token', null);
          });
        },
        view.div().text("You are logged into TigerFace")
      )
    );
  }

  //handle all state changes
  state.addHandler('index', {

    token: function(token) {
      $content.empty();
      if (token) {
        var $p = common.authGet(token)('user', {});
        $p.then(function(result) {
          state.update('user', result.user);
        });
      } else {
        renderStartView();
      }
    },

    user: function(user) {
      if (user) {
        renderHomeView(user);
      }
    }


  });


});
