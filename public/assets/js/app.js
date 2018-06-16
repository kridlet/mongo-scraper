/* gloabl bootbox */
$(document).ready(function () {
  // Adding event listeners for buttons
  $(document).on("click", ".btn.save", handleArticleSave);
  $(document).on("click", ".btn.delete", handleArticleDelete);
  $(document).on("click", ".btn.scrape-new", handleArticleScrape);
  $(document).on("click", ".btn.notes", handleArticleNotes);
  $(document).on("click", ".btn.note-save", handleNoteSave);
  $(document).on("click", ".btn.note-delete", handleNoteDelete);

  function handleArticleSave() {
    // This function is triggered when the user wants to save an article
    // When we rendered the article initially, we attatched a javascript object containing the headline id
    // to the element using the .data method. Here we retrieve that.
    let articleToSave = $(this).data('id');
    articleToSave.saved = true;
    $.ajax({
      method: "PUT",
      url: "/save/" + articleToSave
    }).then(function (data) {
      if (data.ok) {
        location.reload();
      }
    });
  }

  function handleArticleDelete() {
    // This function is triggered when the user wants to remove a saved article
    // When we rendered the article initially, we attatched a javascript object containing the headline id
    // to the element using the .data method. Here we retrieve that.
    let articleToDelete = $(this).data('id');
    articleToDelete.saved = false;
    $.ajax({
      method: "DELETE",
      url: "/delete/" + articleToDelete
    }).then(function (data) {
      if (data.ok) {
        location.reload();
      }
    });
  }

  function handleArticleScrape() {
    // This function handles the user clicking any "scrape new article" buttons
    $.get("/scrape").then(function (data) {
      // If we are able to succesfully scrape the NYTIMES and compare the articles to those
      // already in our collection, re render the articles on the page
      // and let the user know how many unique articles we were able to save
      bootbox.alert("<h3 class='text-center m-top-80'>Retrieved " + data.newArticleCount + " new articles!<h3>");
    });
  }

  function renderNotesList(data) {
    // This function handles rendering note list items to our notes modal
    // Setting up an array of notes to render after finished
    // Also setting up a currentNote variable to temporarily store each note
    var notesToRender = [];
    var currentNote;
    if (!data.notes.notes.length) {
      // If we have no notes, just display a message explaing this
      currentNote = ["<li class='list-group-item'>", "No notes for this article yet.", "</li>"].join("");
      notesToRender.push(currentNote);
    }
    else {
      // If we do have notes, go through each one
      for (var i = 0; i < data.notes.notes.length; i++) {
        // Constructs an li element to contain our noteText and a delete button
        currentNote = $(
          [
            "<li class='list-group-item note'>",
            data.notes.notes[i].body,
            "<button class='btn btn-danger note-delete'>x</button>",
            "</li>"
          ].join("")
        );
        // Store the note id on the delete button for easy access when trying to delete
        currentNote.children("button").data("_id", data.notes.notes[i]._id);
        // Adding our currentNote to the notesToRender array
        notesToRender.push(currentNote);
      }
    }
    // Now append the notesToRender to the note-container inside the note modal
    $(".note-container").append(notesToRender);
  }

  function handleArticleNotes() {
    // This function handles opending the notes modal and displaying our notes
    // We grab the id of the article to get notes for from the panel element the delete button sits inside
    //var currentArticle = $(this).parents(".panel").data();
    let currentArticle = $(this).data('id');
    // Grab any notes with this headline/article id
    $.get("/notes/" + currentArticle).then(function(data) {
      // Constructing our initial HTML to add to the notes modal
      var modalText = [
        "<div class='container-fluid text-center'>",
        "<h4>Notes For Article: ",
        currentArticle,
        "</h4>",
        "<hr />",
        "<ul class='list-group note-container'>",
        "</ul>",
        "<textarea placeholder='New Note' rows='4' cols='60'></textarea>",
        "<button class='btn btn-success note-save'>Save Note</button>",
        "</div>"
      ].join("");
      // Adding the formatted HTML to the note modal
      bootbox.dialog({
        message: modalText,
        closeButton: true
      });
      var noteData = {
        _id: currentArticle,
        notes: data || []
      };
      // Adding some information about the article and article notes to the save button for easy access
      // When trying to add a new note
      $(".btn.note-save").data("article", noteData);
      // renderNotesList will populate the actual note HTML inside of the modal we just created/opened
      renderNotesList(noteData);
    });
  }

  function handleNoteSave() {
    // This function handles what happens when a user tries to save a new note for an article
    // Setting a variable to hold some formatted data about our note,
    // grabbing the note typed into the input box

    var noteData;
    var newNote = $(".bootbox-body textarea").val().trim();
    // If we actually have data typed into the note input field, format it
    // and post it to the "/api/notes" route and send the formatted noteData as well
    if (newNote) {
      noteData = {
        _id: $(this).data("article")._id,
        noteText: newNote
      };

      $.post("/createNote", noteData).then(function() {
        // When complete, close the modal
        bootbox.hideAll();
      });
    }
  }

  function handleNoteDelete() {
    // This function handles the deletion of notes
    // First we grab the id of the note we want to delete
    // We stored this data on the delete button when we created it
    var noteToDelete = $(this).data("_id");
    // Perform an DELETE request to "/api/notes/" with the id of the note we're deleting as a parameter
    $.ajax({
      url: "/deleteNote/" + noteToDelete,
      method: "DELETE"
    }).then(function() {
      // When done, hide the modal
      bootbox.hideAll();
    });
  }
});