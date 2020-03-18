$(document).ready(function () {
    //Handle Scrape button
    $("#scrape").on("click", function () {
        $.ajax({
            method: "GET",
            url: "/scrape",
        }).done(function (data) {
            console.log(data)
            window.location = "/"
        })
    });

    //Set clicked nav option to active
    $(".navbar-nav li").click(function () {
        $(".navbar-nav li").removeClass("active");
        $(this).addClass("active");
    });

    //Handle Save Article button
    $(".save").on("click", function () {
        var thisId = $(this).attr("data-id");
        console.log("save click button" + thisId);
        $.ajax({
            method: "POST",
            url: "/articles/save/" + thisId
        }).done(function (data) {
            window.location = "/"
        })
    });

    //Handle Delete Article button
    $(".delete").on("click", function () {
        var thisId = $(this).attr("data-id");
        $.ajax({
            method: "POST",
            url: "/articles/delete/" + thisId
        }).done(function (data) {
            window.location = "/saved"
        })
    });


    //Handle Save Note button
    $(".saveNote").on("click", function () {
        var thisId = $(this).attr("data-id");
        console.log("note button" + thisId);
        if (!$("#noteText" + thisId).val()) {
            alert("please enter a note to save")
        } else {
            $.ajax({
                method: "POST",
                url: "/note/saved/" + thisId,
                data: {
                    text: $("#noteText" + thisId).val()
                }
            }).done(function (data) {
                // Log the response
                console.log(data);
                // Empty the notes section
                $("#noteText" + thisId).val("");
                $(".modalNote").modal("hide");
                //window.location = "/saved"
                window.location.reload(true);
            });
        }
    });

    //Handle Delete Note button
    $(".deleteNote").on("click", function () {
        var noteId = $(this).attr("data-note-id");
        var articleId = $(this).attr("data-article-id");
        console.log("delete button"+noteId);
        console.log("delete button"+articleId);
        $.ajax({
            method: "DELETE",
            url: "/note/delete/" + noteId + "/" + articleId
        }).done(function (data) {
            console.log(data)
            $(".modalNote").modal("hide");
            window.location = "/saved"
        })
    });
})