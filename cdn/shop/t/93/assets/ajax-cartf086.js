/** Shopify CDN: Minification failed

Line 669:26 Unexpected ";"

**/
/*============================================================================
  Money Format
  - Shopify.format money is defined in option_selection.js.
    If that file is not included, it is redefined here.
==============================================================================*/
if ((typeof Shopify) === 'undefined') { Shopify = {}; }
if (!Shopify.formatMoney) {
  Shopify.formatMoney = function(cents, format) {
    var value = '',
        placeholderRegex = /\{\{\s*(\w+)\s*\}\}/,
        formatString = (format || this.money_format);

    if (typeof cents == 'string') {
      cents = cents.replace('.','');
    }

    function defaultOption(opt, def) {
      return (typeof opt == 'undefined' ? def : opt);
    }

    function formatWithDelimiters(number, precision, thousands, decimal, noTrailingZeros) {
      precision = defaultOption(precision, 2);
      thousands = defaultOption(thousands, ',');
      decimal   = defaultOption(decimal, '.');

      if (isNaN(number) || number == null) {
        return 0;
      }

      number = (number/100.0).toFixed(precision);

      var parts   = number.split('.'),
          dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
          cents   = parts[1] ? (decimal + parts[1]) : '';

      if (parts[1] == '00' && noTrailingZeros) {
        return dollars;
      }else {
        return dollars + cents;
      }
    }

    switch(formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_trailing_zeros':
        value = formatWithDelimiters(cents, 2, ',', '.', true);
      break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
    }

    return formatString.replace(placeholderRegex, value);
  };
}

Shopify.handleize = function (str) {
    return str.toLowerCase().replace(/[^\w\u00C0-\u024f]+/g, "-").replace(/^-+|-+$/g, "");
};

/*============================================================================
  Ajax the add to cart experience by revealing it in a side drawer
  Plugin Documentation - http://shopify.github.io/Timber/#ajax-cart
  (c) Copyright 2015 Shopify Inc. Author: Carson Shold (@cshold). All Rights Reserved.

  This file includes:
    - Basic Shopify Ajax API calls
    - Ajax cart plugin

  This requires:
    - jQuery 1.8+
    - handlebars.min.js (for cart template)
    - modernizr.min.js
    - snippet/ajax-cart-template.liquid

  Customized version of Shopify's jQuery API
  (c) Copyright 2009-2015 Shopify Inc. Author: Caroline Schnapp. All Rights Reserved.
==============================================================================*/
if ((typeof ShopifyAPI) === 'undefined') { ShopifyAPI = {}; }

/*============================================================================
  API Helper Functions
==============================================================================*/
function attributeToString(attribute) {
  if ((typeof attribute) !== 'string') {
    attribute += '';
    if (attribute === 'undefined') {
      attribute = '';
    }
  }
  return jQuery.trim(attribute);
};

/*============================================================================
  API Functions
==============================================================================*/
ShopifyAPI.onCartUpdate = function(cart) {
  // alert('There are now ' + cart.item_count + ' items in the cart.');
};

ShopifyAPI.updateCartNote = function(note, callback) {
  var $body = $(document.body),
  params = {
    type: 'POST',
    url: '/cart/update.js',
    data: 'note=' + attributeToString(note),
    dataType: 'json',
    beforeSend: function() {
      $body.trigger('beforeUpdateCartNote.ajaxCart', note);
    },
    success: function(cart) {
      if ((typeof callback) === 'function') {
        callback(cart);
      }
      else {
        ShopifyAPI.onCartUpdate(cart);
      }
      $body.trigger('afterUpdateCartNote.ajaxCart', [note, cart]);
    },
    error: function(XMLHttpRequest, textStatus) {
      $body.trigger('errorUpdateCartNote.ajaxCart', [XMLHttpRequest, textStatus]);
      ShopifyAPI.onError(XMLHttpRequest, textStatus);
    },
    complete: function(jqxhr, text) {
      $body.trigger('completeUpdateCartNote.ajaxCart', [this, jqxhr, text]);
    }
  };
  jQuery.ajax(params);
};

ShopifyAPI.onError = function(XMLHttpRequest, textStatus) {
  var data = eval('(' + XMLHttpRequest.responseText + ')');
  if (!!data.message) {
    alert(data.message + '(' + data.status  + '): ' + data.description);
  }
};

/*============================================================================
  POST to cart/add.js returns the JSON of the cart
    - Allow use of form element instead of just id
    - Allow custom error callback
==============================================================================*/
ShopifyAPI.addItemFromForm = function(form, callback, errorCallback) {
  var $body = $(document.body);

  var params = {
    type: 'POST',
    url: '/cart/add.js',
    data: jQuery(form).serialize(),
    dataType: 'json',
    beforeSend: function(jqxhr, settings) {
      $(document.body).trigger('beforeAddItem.ajaxCart', form);
    },
    success: function(line_item) {
      if ((typeof callback) === 'function') {
        callback(line_item, form);
      }
      
      $body.trigger('afterAddItem.ajaxCart', [line_item, form]);
     
     if (typeof trigger_messages === "function") {
       BOLD.common.themeCartCallback = ajaxCart.load;
       
       trigger_messages();
     }

    },
    error: function(XMLHttpRequest, textStatus) {
      if ((typeof errorCallback) === 'function') {
        errorCallback(XMLHttpRequest, textStatus);
      }
      else {
        ShopifyAPI.onError(XMLHttpRequest, textStatus);
      }
      $body.trigger('errorAddItem.ajaxCart', [XMLHttpRequest, textStatus]);
    },
    complete: function(jqxhr, text) {
      $(document.body).trigger('completeAddItem.ajaxCart', [this, jqxhr, text]);
    }
  };

  // make this function thenable, then we don't have to call additional cbs inside the callback
  return jQuery.when(jQuery.ajax(params));
};

// Get from cart.js returns the cart in JSON
ShopifyAPI.getCart = function(callback) {
  // make this function thenable, then we don't have to call additional cbs inside the callback
  return jQuery.when(
    jQuery.ajax({
      type: 'GET',
      url: '/cart.js',
      beforeSend: function() {
        // $(document.body).trigger('beforeGetCart.ajaxCart');
      },
      success: function(cart) {

        if (typeof callback !== 'function') { return }
        callback(cart);
        // $(document.body).trigger('afterGetCart.ajaxCart', cart);
      },
      dataType: 'json'
    })
  );

};

// Update cart, bulk change cart items
ShopifyAPI.updateCart = function(data, callback) {
  // make this function thenable, then we don't have to call additional cbs inside the callback
  return jQuery.when(
    $.ajax({
      type: 'POST',
      url: '/cart/update.js',
      data: {
        updates: data
      },
      success: function(data) {
        if(!callback) { return };
        callback(data)
      },
      error: function(XMLHttpRequest, textStatus) {
        // $body.trigger('errorUpdateCart.ajaxCart', [XMLHttpRequest, textStatus]);
        ShopifyAPI.onError(XMLHttpRequest, textStatus);
      },
      dataType: 'json'
    })
  );
};

// POST to cart/change.js returns the cart in JSON
ShopifyAPI.changeItem = function(line, quantity, callback) {
  var $body = $(document.body);

  params = {
    type: 'POST',
    url: '/cart/change.js',
    data: 'quantity=' + quantity + '&line=' + line,
    dataType: 'json',
    beforeSend: function() {
      // $body.trigger('beforeChangeItem.ajaxCart', [line, quantity]);
    },
    success: function(cart) {
      if ((typeof callback) === 'function') {
        callback(cart);
      }

      // $body.trigger('afterChangeItem.ajaxCart', [line, quantity, cart]);
     if (typeof trigger_messages === "function") {
       BOLD.common.themeCartCallback = ajaxCart.load;
       
       trigger_messages();
     }
    },
    error: function(XMLHttpRequest, textStatus) {
      $body.trigger('errorChangeItem.ajaxCart', [XMLHttpRequest, textStatus]);
      ShopifyAPI.onError(XMLHttpRequest, textStatus);
    },
    complete: function(jqxhr, text) {
      // $body.trigger('completeChangeItem.ajaxCart', [this, jqxhr, text]);
      // console.log('change item completed!');
    }
  };

  // make this function thenable, then we don't have to call additional cbs inside the callback
  return jQuery.when(jQuery.ajax(params));
};

/*============================================================================
  Ajax Shopify Add To Cart
==============================================================================*/
var ajaxCart = (function(module, $) {

  'use strict';

  // Public functions
  var init, loadCart;

  // Private general variables
  var settings, isUpdating, $body;

  // Private plugin variables
  var $formContainer, $addToCart, $cartCountSelector, $cartCostSelector, $cartContainer, $drawerContainer;

  // Handle Events (add, remove, adjust etc.)
  var listenAPIEvents, listenAdjustCart;

  // Private functions
  var initAjaxQtySelectors, initQtySelectors;

  // Callbacks
  var updateCountPrice, itemErrorCallback, cartUpdateCallback, buildCart;

  // Helpers
  var validateQty, buildVariantOptions, delay;

  /*============================================================================
    Initialise the plugin and define global options
  ==============================================================================*/
  
  // public functions

  init = function (options) {
    // Default settings
    settings = {
      formSelector       : 'form[action^="/cart/add"]',
      cartContainer      : '#CartContainer',
      addToCartSelector  : 'input[type="submit"]',
      cartCountSelector  : null,
      cartCostSelector   : null,
      moneyFormat        : '$',
      disableAjaxCart    : false,
      enableQtySelectors : true
    };

    // Override defaults with arguments
    $.extend(settings, options);

    // Select DOM elements
    $formContainer     = $(settings.formSelector);
    $cartContainer     = $(settings.cartContainer);
    $addToCart         = $formContainer.find(settings.addToCartSelector);
    $cartCountSelector = $(settings.cartCountSelector);
    $cartCostSelector  = $(settings.cartCostSelector);

    // General Selectors
    $body = $(document.body);

    // Track cart activity status
    isUpdating = false;

    // Replace normal qty with js qty selectors
    if (settings.enableQtySelectors) {
      initQtySelectors();
    }

    // register API events
    listenAPIEvents();

    // register cart adjust events
    listenAdjustCart();
  };

  loadCart = function () {
    ShopifyAPI.getCart(cartUpdateCallback);
  };

  // private functions

  // init js qty selectors
  initQtySelectors = function() {
    // Change number inputs to JS ones, similar to ajax cart but without API integration.
    // Make sure to add the existing name and id to the new input element
    var numInputs = $('input[type="number"]');

    if (numInputs.length) {
      numInputs.each(function() {
        var $el = $(this),
            currentQty = $el.val(),
            inputName = $el.attr('name'),
            inputId = $el.attr('id');

        var itemAdd = currentQty + 1,
            itemMinus = currentQty - 1,
            itemQty = currentQty;

        var source   = $("#JsQty").html(),
            template = Handlebars.compile(source),
            data = {
              key: $el.data('id'),
              itemQty: itemQty,
              itemAdd: itemAdd,
              itemMinus: itemMinus,
              inputName: inputName,
              inputId: inputId
            };

        // Append new quantity selector then remove original
        $el.after(template(data)).remove();
      });

      // Setup listeners to add/subtract from the input
      $('.js-qty__adjust').on('click', function() {
        var $el = $(this),
            id = $el.data('id'),
            $qtySelector = $el.siblings('.js-qty__num'),
            qty = parseInt($qtySelector.val().replace(/\D/g, ''));

        var qty = validateQty(qty);

        // Add or subtract from the current quantity
        if ($el.hasClass('js-qty__adjust--plus')) {
          qty += 1;
        } else {
          qty -= 1;
          if (qty <= 1) qty = 1;
        }

        // Update the input's number
        $qtySelector.val(qty);
      });
    }
  };

  initAjaxQtySelectors = function() {
    // If there is a normal quantity number field in the ajax cart, replace it with our version
    if ($('input[type="number"]', $cartContainer).length) {
      $('input[type="number"]', $cartContainer).each(function() {
        var $el = $(this),
            currentQty = $el.val();

        var itemAdd = currentQty + 1,
            itemMinus = currentQty - 1,
            itemQty = currentQty;

        var source   = $("#AjaxQty").html(),
            template = Handlebars.compile(source),
            data = {
              key: $el.data('id'),
              itemQty: itemQty,
              itemAdd: itemAdd,
              itemMinus: itemMinus
            };

        // Append new quantity selector then remove original
        $el.after(template(data)).remove();
      });
    }
  };

  // register API events
  listenAPIEvents = function() {
    // Take over the add to cart form submit action if ajax enabled
    if (!settings.disableAjaxCart && $addToCart.length) {
      $formContainer.on('submit', function(evt) {
        evt.preventDefault();

        // Add class to be styled if desired
        $addToCart.removeClass('is-added').addClass('is-adding');

        // Remove any previous quantity errors
        $('.qty-error').remove();

        ShopifyAPI.addItemFromForm(evt.target, null, itemErrorCallback)
          .then(function() {
            // End add to cart style
            $addToCart.removeClass('is-adding').addClass('is-added');
            
            // Show spinner
            $body.addClass('drawer--is-loading');

            return ShopifyAPI.getCart(cartUpdateCallback);
          })
          .then(function() {
            // Hide spinner
            $body.removeClass('drawer--is-loading')
          })
          .fail(function(err) {
            console.log(err);
          });
      });
    }

    // update items
    $(document).on('change', '.ajaxcart__qty-num', function(evt, line, qty) {
      isUpdating = true;
      // show spinner
      $body.addClass('drawer--is-loading');

      // Add activity classes when changing cart quantities
      var $row = $('.ajaxcart__row[data-line="' + line + '"]').addClass('is-loading');

      if (qty === 0) {
        $row.parent().addClass('is-removed');
      }

      // Slight delay to make sure removed animation is done
      delay(250)
        .then(function() {
          return ShopifyAPI.changeItem(line, qty);
        })
        .then(function(cart) {
          // Update quantity and price
          updateCountPrice(cart);

          // Reprint cart on short timeout so you don't see the content being removed
          return delay(150);
        })
        .then(function() {
          isUpdating = false;
          return ShopifyAPI.getCart(buildCart);
        })
        .then(function() {
          // Hide spinner
          $body.removeClass('drawer--is-loading');
        })
        .fail(function(err) {
          console.log(err);
        });
    });

    // remove items
    $(document).on('click', '.ajaxcart__btn-remove', function(evt) {
      evt.preventDefault();
      
      var id = $(this).data('id');
      var updatesData = {};
      updatesData[id] = 0;

      // Show spinner
      $body.addClass('drawer--is-loading');

      delay(150)
        .then(function() {
          return ShopifyAPI.updateCart(updatesData, cartUpdateCallback)
        })
        .then(function() {
          // Hide spinner
          $body.removeClass('drawer--is-loading');
        })
        .fail(function(err) {
          console.log(err);
        });
    });
  }

  // register cart adjust events
  listenAdjustCart = function () {
    // Delegate all events because elements reload with the cart

    // Add or remove from the quantity
    $body.on('click', '.ajaxcart__qty-adjust', function() {
      if (isUpdating) {
        return;
      }

      var $el = $(this),
          line = $el.data('line'),
          $qtySelector = $el.siblings('.ajaxcart__qty-num'),
          qty = validateQty(parseInt($qtySelector.val().replace(/\D/g, '')));

      // Add or subtract from the current quantity
      if ($el.hasClass('ajaxcart__qty--plus')) {
        qty += 1;
      } else {
        qty -= 1;
        if (qty <= 0) qty = 0;
      }

      // update the input's number
      $qtySelector.val(qty);
      
      // Trigger the change event
      $qtySelector.trigger('change', [line, qty]);
    });

    // Update quantity based on input on change
    $body.on('change', '.ajaxcart__qty-num', function() {
      if (isUpdating) {
        return;
      }

      var $el = $(this),
          line = $el.data('line'),
          qty = parseInt($el.val().replace(/\D/g, ''));

      var qty = validateQty(qty);
    });

    // Prevent cart from being submitted while quantities are changing
    $body.on('submit', 'form.ajaxcart', function(evt) {
      if (isUpdating) {
        evt.preventDefault();
      }
    });

    // Highlight the text when focused
    $body.on('focus', '.ajaxcart__qty-adjust', function() {
      var $el = $(this);
      setTimeout(function() {
        $el.select();
      }, 50);
    });

    // Save note anytime it's changed
    // $body.on('change', 'textarea[name="note"]', function() {
    //   var newNote = $(this).val();

    //   // Update the cart note in case they don't click update/checkout
    //   ShopifyAPI.updateCartNote(newNote, function(cart) {});
    // });
  };

  // callbacks
  
  itemErrorCallback = function (XMLHttpRequest, textStatus) {
    var data = eval('(' + XMLHttpRequest.responseText + ')');
    $addToCart.removeClass('is-adding is-added');

    if (!!data.message) {
      if (data.status == 422) {
        $formContainer.after('<div class="errors qty-error">'+ data.description +'</div>')
      }
    }
  };

  cartUpdateCallback = function (cart) {
    // Update quantity and price
    updateCountPrice(cart);

    // build cart init paypal button
    buildCart(cart).then(function() {
      if (window.Shopify && Shopify.StorefrontExpressButtons && Shopify.StorefrontExpressButtons.initialize) {
        Shopify.StorefrontExpressButtons.initialize();
      }
    });
  };

  updateCountPrice = function (cart) {
    if ($cartCountSelector) {
      $cartCountSelector.html(cart.item_count).removeClass('hidden-count');

      if (cart.item_count === 0) {
        $cartCountSelector.addClass('hidden-count');
      }
    }
    if ($cartCostSelector) {
      $cartCostSelector.html(Shopify.formatMoney(cart.total_price, settings.moneyFormat));
    }
  };

  buildCart = function (cart) {

    // make this func thenable, then we don't have to call cbs inside this fucntion
    var deferred = jQuery.Deferred();

    // Start with a fresh cart div
    $cartContainer.empty();

    // Show empty cart
    if (cart.item_count === 0) {
      $cartContainer.append('<p class="ajaxcart__empty-message">You have no items in your shopping cart.</p> <button type="button" class="btn ajaxcart__btn-continue js-ajaxcart-close">CONTINUE SHOPPING</button>');
      
      deferred.resolve(cart);
      return deferred.promise();
    }

    // Handlebars.js cart layout
    var items = [],
        item = {},
        data = {},
        source = $("#CartTemplate").html(),
        template = Handlebars.compile(source);

    var enableDiscount = true;
    var discountPercent = ;
    var discountAmount = 8;
    var discountType = "amount";
    
    // Add each item to our handlebars.js data
    $.each(cart.items, function(index, cartItem) {
      // console.log(cartItem);
      var variantOptions = buildVariantOptions(cartItem.variant_options),
          colorOption = _.find(variantOptions, function(ele) {
            return ele.key == 'color';
          }),
          colorValue = colorOption ? '-color-' + Shopify.handleize(colorOption.value) : '';
      
      // set product image  url
      var prodImgRaw = "//teefury.com/cdn/shop/files/art-placeholder.jpeg?28014";
      
      var prodImg = prodImgRaw.replace(/placeholder/, cartItem.handle + colorValue);

      // Calculate original and discounted line price
      var originalLinePrice = cartItem.original_line_price;
      var linePrice = cartItem.line_price;
      if (enableDiscount && cartItem.properties.sitewide_discount == "true") 
      {
        if(discountType == "percent")
        {
          var tempValue = 100 - discountPercent;
          var multiplier = tempValue / 100;
          originalLinePrice = originalLinePrice / cartItem.quantity;
          linePrice = linePrice / cartItem.quantity;
          originalLinePrice = cartItem.line_price * multiplier;
          linePrice = cartItem.line_price * multiplier;

          originalLinePrice = originalLinePrice * cartItem.quantity;
          linePrice = linePrice * cartItem.quantity;
        }
        else
        {
          var tempValue = discountAmount * 100;
          var poriginalLinePrice = originalLinePrice / cartItem.quantity;
          var plinePrice = linePrice / cartItem.quantity;
          
          originalLinePrice = poriginalLinePrice - tempValue;
          linePrice = plinePrice - tempValue;

          originalLinePrice = originalLinePrice * cartItem.quantity;
          linePrice = linePrice * cartItem.quantity;
        }
      }
      // console.log(cartItem.variant_options);

      // Create item's data object and add to 'items' array
      item = {
        key: cartItem.key,
        line: index + 1, // Shopify uses a 1+ index in the API
        url: cartItem.url,
        img: prodImg,
        name: cartItem.product_title,
        variantId: cartItem.variant_id,
        variation: cartItem.variant_title,
        variantOptions: variantOptions,
        properties: cartItem.properties,
        itemAdd: cartItem.quantity + 1,
        itemMinus: cartItem.quantity - 1,
        itemQty: cartItem.quantity,
        price: Shopify.formatMoney(cartItem.price, settings.moneyFormat),
        type: cartItem.product_type,
        vendor: cartItem.vendor,
        linePrice: Shopify.formatMoney(linePrice, settings.moneyFormat),
        originalLinePrice: Shopify.formatMoney(originalLinePrice, settings.moneyFormat),
        discounts: cartItem.discounts,
        discountsApplied: cartItem.line_price === cartItem.original_line_price ? false : true
      };

      items.push(item);
    });

    // Gather all cart data and add to DOM
    data = {
      items: items,
      note: cart.note,
      totalPrice: Shopify.formatMoney(cart.total_price, settings.moneyFormat),
      totalCartDiscount: cart.total_discount === 0 ? 0 : "Translation missing: en.cart.general.savings_html".replace('[savings]', Shopify.formatMoney(cart.total_discount, settings.moneyFormat)),
      totalCartDiscountApplied: cart.total_discount === 0 ? false : true
    }

    $cartContainer.append(template(data));
    
    deferred.resolve(cart);
    return deferred.promise();
  };

  // helpers

  buildVariantOptions = function(variantOptions) {
    var variantsMap = {
      printSide: ['front', 'back'],
      gender: ['men', 'mens', 'men-premium', 'mens-premium', 'womens', 'women', 'womens-fitted', 'women-fitted', 'youth'],
      size: ['16x12', '24x18', '40x27', '12x16', '18x24', '27x40', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl'],
      color: ['who-knows', 'black', 'navy', 'red', 'charcoal', 'royal-blue', 'blue', 'dark-chocolate', 'deep-purple', 'silver', 'powder-blue', 'kelly', 'turquoise', 'cream', 'white', 'heather-gray']
    }

    return variantOptions.map(function(option) {
      var variantOption = {};
      $.each(variantsMap, function(key, value) {
        
        if(value.indexOf(Shopify.handleize(option)) > -1) {
          // console.log(key, option);
          
          if (key == 'size') {
            option = option.toUpperCase();
          }else if (key == 'printSide') {
            key = 'print side';
            // captalize option
            option = option.charAt(0).toUpperCase() + option.slice(1);
          }else {
            // captalize option
            option = option.charAt(0).toUpperCase() + option.slice(1);
          }
          
          variantOption.key = key;
          variantOption.value = option;

        }
      });

      return variantOption;
    }).filter(function(option) {
      return option.key != 'print side';
    });
  };

  validateQty = function (qty) {
    if((parseFloat(qty) == parseInt(qty)) && !isNaN(qty)) {
      // We have a valid number!
    } else {
      // Not a number. Default to 1.
      qty = 1;
    }
    return qty;
  };

  delay = function(ms, data) {
    // delay a jquery deferred object
    var deferred = jQuery.Deferred();
    setTimeout(function() {
      if (!data) {
        deferred.resolve();
      }else {
        deferred.resolve(data)
      }
    }, ms);

    return deferred.promise();
  }

  module = {
    init: init,
    load: loadCart
  };

  return module;

}(ajaxCart || {}, jQuery));

jQuery(function($) {
  ajaxCart.init({
    formSelector: '.product-form',
    cartContainer: '#CartContainer',
    addToCartSelector: '.product-form__cart-submit',
    // cartCountSelector: '#CartCount span',
    // cartCostSelector: '#CartCost',
    moneyFormat: '${{amount}}'
  });

  // if it's cart page
  if ($(document.body).hasClass('template-cart')) {
    $('.js-ajaxcart-open').on('click', function() {
      window.location.href = "/cart";
    });

  // if it's not cart page
  }else {
    // init drawer
    theme.CartDrawer = new theme.Drawers('CartDrawer', 'top', {
      onDrawerOpen: ajaxCart.load
    })

    // bind open
    $(document.body).on('beforeAddItem.ajaxCart', function () {
      theme.CartDrawer.open();
    })

    $('.js-ajaxcart-open').on('click', theme.CartDrawer.open.bind(theme.CartDrawer));

    // bind close
    $(document).on('click', '.js-ajaxcart-close', theme.CartDrawer.close.bind(theme.CartDrawer));
  }

});