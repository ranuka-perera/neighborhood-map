ko.bindingHandlers.typeahead = {
    // Update the filter typeahead when data is reloaded.
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);
        var source = ko.utils.unwrapObservable(valueAccessor());
        $element.typeahead('destroy');

        var options = { hint: false, highlight: true};
        var dataset = { source: substringMatcher(source), limit: 5};

        $element.typeahead(options, dataset);
    }
};

// From typeahead doc.
var substringMatcher = function(strs) {
  return function findMatches(q, cb) {
    var matches, substrRegex;

    // an array that will be populated with substring matches
    matches = [];

    // regex used to determine if a string contains the substring `q`
    substrRegex = new RegExp(q, 'i');

    // iterate through the pool of strings and for any string that
    // contains the substring `q`, add it to the `matches` array
    $.each(strs, function(i, str) {
      if (substrRegex.test(str)) {
        matches.push(str);
      }
    });

    cb(matches);
  };
};