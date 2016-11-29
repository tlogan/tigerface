'use strict';

$(function() {

  var $content = $("#content");
  var state = mkState();

  common.get('token', {}, function(result) {
    console.log("you are not already logged in: " + JSON.stringify(result));
    state.update('token', result.token);
  });

  function mkLogInDiv() {

    return view.div({id: 'log_in_panel', class: 'panel'}).append(
      view.div().append(
        view.div().append(
          view.input({id: 'log_in_username', type: 'text', placeholder: 'username'})
        ),
        view.div().append(
          view.input({id: 'log_in_password', type: 'password', placeholder: 'password'})
        )
      ), 
      view.button({id: 'log_in_button', text: 'Log in'}).click(function() {
        var username = $(this).prev().find('input#log_in_username').val();
        var password = $(this).prev().find('input#log_in_password').val();
        var $p = common.post('login', {username: username, password: password});
        $p.then(function(result) {
          state.update('token', result.token);
        });
      })

    );
  }

  function mkSignUpDiv() {

    return view.div({id: 'sign_up_panel', class: 'panel'}).append(
      view.div().append(
        view.div().append(
          view.input({id: 'sign_up_full_name', type: 'text', placeholder: 'full name'})
        ),
        view.div().append(
          view.input({id: 'sign_up_username', type: 'text', placeholder: 'username'})
        ),
        view.div().append(
          view.input({id: 'sign_up_password', type: 'password', placeholder: 'password'})
        )
      ), 
      view.button({id: 'sign_up_button', text: 'Sign up'}).click(function() {
        var fullName = $(this).prev().find('input#sign_up_full_name').val();
        var username = $(this).prev().find('input#sign_up_username').val();
        var password = $(this).prev().find('input#sign_up_password').val();
        var $p = common.post('signup', {fullName: fullName, username: username, password: password});
        $p.then(function(result) {
          console.log("just created new user: " + JSON.stringify(result));
          state.update('token', result.token);
        });
      })
    );
  }

  function mkStartDiv() {
    return view.div({id: 'start_section'}).append(
      view.div().html(mkLogInDiv),
      view.div().html(mkSignUpDiv)
    );
  }



  //handle all state changes
  state.addHandler('index', {

    token: function(token) {
      $content.empty();
      if (token) {
        $content.append(
          view.div().text("You are logged into TigerFace"),
          view.button({id: 'log_out_button', text: 'Log out'}).click(function() {
            var $p = common.post('logout');
            $p.then(function() {
              state.update('token', null);
            });
          })
        );
      } else {
        $content.empty().append(mkStartDiv());
      }
    }

  });




});
