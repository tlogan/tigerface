"use strict";

var view = (function() {

  var div = function(attrs) {
    return $('<div>', attrs);
  };

  var a = function(attrs) {
    return $('<a>', attrs);
  };

  var textarea = function(attrs) {
    return $('<textarea>', attrs);
  };

  var navlink = function(attrs) {
    return $('<a>', _.assign({class: 'navlink'}, attrs));
  };

  var input = function(attrs) {
    return $('<input>', attrs);
  };

  var button = function(attrs) {
    return $('<button>', attrs);
  };

  var span = function(attrs) {
    return $('<span>', attrs);
  };

  var label = function(attrs) {
    return $('<label>', attrs);
  };


  var img = function(attrs) {
    return $('<img>', attrs);
  };
 
  var uploadButton = function(attrs, onChange) {
    var b = span(attrs);
    var fileInput = view.input({type: 'file', class: 'file', required: true}).change(function() {
      var file = fileInput && fileInput.val() ? fileInput[0].files[0] : null;
      onChange(file);
    });
    return label({class: 'upload_button'}).append(
      b, fileInput
    ); 
  };

  function mkLogInDiv(update) {

    return div({id: 'log_in_panel', class: 'panel'}).append(
      div().append(
        div().append(
          input({id: 'log_in_username', type: 'text', placeholder: 'username'})
        ),
        div().append(
          input({id: 'log_in_password', type: 'password', placeholder: 'password'})
        )
      ), 
      button({id: 'log_in_button', text: 'Log in'}).click(function() {
        var username = $(this).prev().find('input#log_in_username').val();
        var password = $(this).prev().find('input#log_in_password').val();
        var $p = common.post('login', {username: username, password: password});
        $p.then(update);
      })

    );
  }

  function mkSignUpDiv(update) {

    return div({id: 'sign_up_panel', class: 'panel'}).append(
      div().append(
        div().append(
          input({id: 'sign_up_full_name', type: 'text', placeholder: 'full name'})
        ),
        div().append(
          input({id: 'sign_up_username', type: 'text', placeholder: 'username'})
        ),
        div().append(
          input({id: 'sign_up_password', type: 'password', placeholder: 'password'})
        )
      ), 
      button({id: 'sign_up_button', text: 'Sign up'}).click(function() {
        var fullName = $(this).prev().find('input#sign_up_full_name').val();
        var username = $(this).prev().find('input#sign_up_username').val();
        var password = $(this).prev().find('input#sign_up_password').val();
        var $p = common.post('signup', {fullName: fullName, username: username, password: password});
        $p.then(update);
          
      })
    );
  }


  function mkFrame(username, logout, $body) {
    return div({id: 'frame'}).append(
      div({id: 'nav'}).append(
        span({id: 'navlink_list'}).append(
          navlink({id: 'home_link', text: 'TigerFace', href: '/'})
        ),
        username ? span({id: 'user_navlink_list'}).append(
          navlink({id: 'profile_link', text: username, href: '/profile/' + username}),
          navlink({id: 'log_out_link', text: 'Log out'}).click(logout)
        ) : null
      ),
      div({id: 'window'}).html($body)
    );
  }

  function mkNoteEditor(update) {
    return div({id: 'note_editor_panel'}).append(
      div().append(
        textarea({id: 'note_editor_text'})
      ), 
      button({id: 'note_editor_button', text: 'Post'}).click(function() {
        var textBody = $(this).prev().find('textarea#note_editor_text').val();
        console.log("textBody: " + textBody);
        update(textBody);
      })
    );
  }


  function mkNoteView(note) {
    return div({id: 'note_view_panel'}).append(
      div().html(
        navlink({id: 'note_view_author', text: note.author, href: '/profile/' + note.author})
      ), 
      div().html(
        div({id: 'note_view_text', text: note.textBody})
      ) 
    );
  }

  return {
    div: div,
    span: span,
    label: label,
    input: input,
    button: button,
    uploadButton: uploadButton,
    img: img,
    mkNoteEditor: mkNoteEditor, 
    mkNoteView: mkNoteView,
    mkLogInDiv: mkLogInDiv,
    mkSignUpDiv: mkSignUpDiv,
    mkFrame: mkFrame
  };

}());
