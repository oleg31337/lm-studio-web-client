$(document).ready(function() {
    hljs.highlightAll(); //initialize highlight.js
    marked.setOptions({
        highlight: function(code) {
            return hljs.highlightAuto(code).value;
        }
    });
    var socket = io.connect('http://' + document.domain + ':' + location.port);
    var lastBotMessage;
    var codeProgressFlag=false;
    //var converter = new showdown.Converter();
    var messageBuffer = '';
    $('#stop_button').prop('disabled', true);

    $('#user_input').keypress(function(e) {
        //console.log(e);
        if (e.which == 13 && e.shiftKey == false) {
            var message = $(this).val();
            if ((message.replace(/\s/g, '')) == '') return; //ignore empty messages
            $(this).val('');
            $('#chatbox').append('<div class="message user-message"><div>' + marked.parse(message) + '</div></div>');
            $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
            socket.emit('message', {message: message});
            $('#stop_button').focus();
        }
    });

    socket.on('response', function(data) {
        // Append new data to the message buffer
        //console.log('Received response:',data) //debug print
        $('#bot-message-placeholder').remove();
        const backtick=/``/;
        if (data.message != null) messageBuffer += data.message;
        //console.log(data.message);
        if (backtick.test(data.message)) codeProgressFlag=!codeProgressFlag;
        if (lastBotMessage) {
            if (codeProgressFlag) $(lastBotMessage).html(marked.parse(messageBuffer+'\n```'));
            else $(lastBotMessage).html(marked.parse(messageBuffer));
        } else {
            // Create a new bot message container
            //$('#chatbox').append('<div class="message bot-message"><div>' + converter.makeHtml(data.message) + '</div></div>');
            $('#chatbox').append('<div class="message bot-message"><div>' + marked.parse(data.message) + '</div></div>');
            // Store the last bot message container
            lastBotMessage = $('#chatbox .bot-message div').last();
        }
        $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
        if (data.message == null) {
            messageBuffer ='' //Empty buffer on the end of the message
            $('#user_input').prop('disabled', false);
            $('#send_button').prop('disabled', false);
            $('#stop_button').prop('disabled', true);
        }
    });
    socket.on('stopped_generation',function(data) {
        //console.warn('stopped generation');
        $('#user_input').prop('disabled', false);
        $('#stop_button').prop('disabled', true);
        $('#send_button').prop('disabled', false);
        $('#user_input').focus();
    });
    socket.on('history_cleared',function(data) {
        $('#user_input').prop('disabled', false);
        $('#stop_button').prop('disabled', true);
        $('#send_button').prop('disabled', false);
        $('#user_input').focus();
    });
    socket.on('started_generation',function(data) {
        //console.warn('started generation');
        lastBotMessage = null; // Reset lastBotMessage for a new conversation turn
        messageBuffer = '';
        $('#user_input').prop('disabled', true);
        $('#stop_button').prop('disabled', false);
        $('#send_button').prop('disabled', true);
        $('#chatbox').append('<div id="bot-message-placeholder" class="message bot-message"><div>'+marked.parse('Thinking...')+'</div></div>');
        $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
        $('#stop_button').focus();
    });
    $('#send_button').click(function() {
        const enterKeyEvent = jQuery.Event("keypress");
        enterKeyEvent.which=13;
        enterKeyEvent.ctrlKey= false;
        enterKeyEvent.shiftKey= false
        $('#user_input').trigger(enterKeyEvent);
    });
    $('#stop_button').click(function() {
        socket.emit('stop_generation');
        $('#user_input').prop('disabled', false);
    });
    $('#clear_history_button').click(function() {
        $('#chatbox').empty();
        socket.emit('clear_history');
        lastBotMessage = null;
        $('#stop_button').prop('disabled', true);
        $('#user_input').prop('disabled', false);
    });
    fetch('/get-session-data')
        .then(response => response.json())
        .then(data => {
            //console.log('Session data:', data);
            for (i=0;i<data.length;i++){
                if (data[i].role=="user") {
                    $('#chatbox').append('<div class="message user-message"><div>' + marked.parse(data[i].content) + '</div></div>');
                }
                else if (data[i].role=="assistant") {
                    $('#chatbox').append('<div class="message bot-message"><div>' + marked.parse(data[i].content) + '</div></div>');
                }
            }
            $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
        })
        .catch(error => {
            console.error('Error fetching session data:', error);
        });
    $('#user_input').focus();
});