(function( $ ) {
	$.Shop = function( element ) {
		this.$element = $( element );
		this.init();
		// First we get the viewport height and we multiple it by 1% to get a value for a vh unit
		let vh = window.innerHeight * 0.01;
		// Then we set the value in the --vh custom property to the root of the document
		document.documentElement.style.setProperty('--vh', `${vh}px`);

		// We listen to the resize event
		window.addEventListener('resize', () => {
			// We execute the same script as before
			let vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty('--vh', `${vh}px`);
		});
	};
	
	$.Shop.prototype = {
		init: function() {
		
				// Properties
		
			this.cartPrefix = "scanapp-"; // Prefijo que le queda al carrito en session storage
			this.cartName = this.cartPrefix + "cart"; // Nombre del carrito en session storage
			this.total = this.cartPrefix + "total"; // Total de la compra en session storage
			this.storage = sessionStorage; // shortcut al objeto de sessionStorage
			
			
			this.$formAddToCart = this.$element.find( "#producto" ); // Página que agrega items al carrito
			this.$formCart = this.$element.find( "main" ); // Main
			this.$checkoutCart = this.$element.find( "#carrito" ); // Página del carrito
			
			this.currency = "$"; // Moneda para HTML

							// Invocación de métodos
							var self = this;
							this.callCommonElements(self);
							
		},
		
		// Metodos públicos
		
		callCommonElements: function (e) {
			var total = $('*[data-includeHTML]').length;
			$("*[data-includeHTML]").each(function (index) {                
				$(this).load($(this).attr("data-includeHTML"), function() {
					if (index === total - 1) {
						e.searchActiveLink();
						e.photoShoot();
						e.createCart();
						e.quantitySelector();
						e.handleAddToCartForm();
						e.updateCart();
						e.displayCart(); // lo necesito corriendo para que popule el ícono del carrito
						e.updateTotal();
						e.updateProduct();
						e.deleteProduct();
						e.showNotifications();
						e.updateNotifications();
					}
				});


			})
		},
		// Agregar link activo en la página
		searchActiveLink: function () {
			self = this;
			var filename = document.location.pathname.match(/[^\/]+$/) ? document.location.pathname.match(/[^\/]+$/)[0] : 'inicio.html';
			$('footer a').each ( function (i, element) {
				if ( $(element).attr('href') == filename) {
					$(element).attr('aria-current', 'page').closest('li').addClass('active');
				}
				if (filename == "codigo_qr.html" || filename == "micompra.html" ) {
					self._emptyCart( self.cartName );
				}
			});
		},
		// Simular foro
		photoShoot: function () {
			$('#cam-scan').on('click', function () {
				$(this).addClass('photo-taken')
							 .find('.cam-content').addClass('prod1').addClass('active')
							 .find('.prod-process').append('Producto Identificado, redirigiendo...').removeClass('d-none').focus();
				setTimeout(function(){ window.location = 'producto.html'; }, 3000);
			});
		},

		// Creates the cart keys in the session storage
		
		createCart: function() {
			if( this.storage.getItem( this.cartName ) == null ) {
			
				var cart = {};
				cart.items = [];
			
				this.storage.setItem( this.cartName, this._toJSONString( cart ) );
				this.storage.setItem( this.total, "0" );
			}
		},
		// Selector de cantidades
		quantitySelector: function() {
			var self = this
			$(".main-container").on("click", ".btn-number", function(e){
				e.preventDefault();
				e.stopPropagation();
				fieldName = $(this).data('field');
				type      = $(this).data('type');
				var input = $("input[name='"+fieldName+"']");
				var currentVal = parseInt(input.val());
				if (!isNaN(currentVal)) {
						if(type == 'minus') {
								
								if(currentVal > input.attr('min')) {
										input.val(currentVal - 1).change();
								} 
								if(parseInt(input.val()) == input.attr('min')) {
										$(this).attr('disabled', true);
								}

								self.updateProduct();
		
						} else if(type == 'plus') {
		
								if(currentVal < input.attr('max')) {
										input.val(currentVal + 1).change();
								}
								if(parseInt(input.val()) == input.attr('max')) {
										$(this).attr('disabled', true);
								}

								self.updateProduct();
		
						}
				} else {
						input.val(0);
				}
			});
			$(".main-container").on("focusin", ".qty-input", function(e){
				$(this).data('oldValue', $(this).val());
			});
			$(".main-container").on("change", ".qty-input", function(e){
					
					minValue =  parseInt($(this).attr('min'));
					maxValue =  parseInt($(this).attr('max'));
					valueCurrent = parseInt($(this).val());
					
					name = $(this).attr('name');
					if(valueCurrent >= minValue) {
						$(".btn-number[data-type='minus'][data-field='"+name+"']").removeAttr('disabled')
					} else {
						alert('Error. La cantidad debe ser mayor a 0.');
						$(this).val($(this).data('oldValue'));
					}
					if(valueCurrent <= maxValue) {
						$(".btn-number[data-type='plus'][data-field='"+name+"']").removeAttr('disabled')
					} else {
						alert('No puedes agregar más de 9 unidades.');
						$(this).val($(this).data('oldValue'));
					}
					self.updateProduct();
			});
			$(".main-container").on("keydown", ".qty-input", function(e){
				if (e.keyCode == 38) {
					e.preventDefault();
					$('.btn-number[data-type="plus"]').click();
				}	else if (e.keyCode == 40) {
					e.preventDefault();
					$('.btn-number[data-type="minus"]').click();
				}
				// Permitir: backspace, delete, tab, escape, enter
				if ($.inArray(e.keyCode, [46, 8, 9, 27]) !== -1 ||
						// Permitir: Ctrl+A
						(e.keyCode == 65 && e.ctrlKey === true) || 
						// Permitir: home, end, left, right
						(e.keyCode >= 35 && e.keyCode <= 39)) {
							// No hacer nada
							return;
				}
				// Asegurarse de que es un número y frenar el keypress
				var validkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
				if (validkeys.indexOf(e.key) < 0) {
					return false;
				}
			});
		},

		updateProduct: function () {
			self = this;
			var qty = $('.qty-input').val();
			var price = self._convertString( $('.qty-input').data('price') );
			var discount = 0; // inicializar variable descuento
			if (qty % 3 == 0) { // si la cantidad es multiplo de 3, aplico la promoción
				discount = qty / 3;
				$('#promo').show();
			} else {
				if ( qty > 3 ) { // si la cantidad es mayor a 3 recalculo la cantidad con la promo
					discount = parseInt(qty/3);
					$('#promo').show();
				} else {
					$('#promo').hide();
				}
			}
			var finalPrice = (qty - discount) * price;
			var total = self._decimals(finalPrice).split(".");
			this.storage.setItem( self.total, total );
			$('.total .prod-monto').find('span').html('$' + total[0] + '<sup>' + total[1] + '</sup>').attr('aria-label', '$'+total[0]+'.'+total[1]);
		},
	
		// Borra un producto del carrito

		deleteProduct: function() {
			var self = this;
			if( self.$formCart.length ) {
				var cart = this._toJSONObject( this.storage.getItem( this.cartName ) );
				var items = cart.items;

				$( document ).on( "click", ".pdelete a", function( e ) {
					e.preventDefault();
					var productName = $( this ).data( "product" );
					var newItems = [];
					for( var i = 0; i < items.length; ++i ) {
						var item = items[i];
						var product = item.product;	
						if( product == productName ) {
							items.splice( i, 1 );
						}
					}
					newItems = items;
					var updatedCart = {};
					updatedCart.items = newItems;

					var updatedTotal = 0;
					var totalQty = 0;
					if( newItems.length == 0 ) {
						updatedTotal = 0;
						totalQty = 0;
					} else {
						for( var j = 0; j < newItems.length; ++j ) {
							var prod = newItems[j];
							var sub = prod.price * prod.qty;
							updatedTotal += sub;
							totalQty += prod.qty;
						}
					}
					self.storage.setItem( self.total, self._convertNumber( updatedTotal ) );
					self.storage.setItem( self.cartName, self._toJSONString( updatedCart ) );
					$( this ).parents( ".cart-block" ).remove();
					self.updateTotal();

				});
			}
		},
		
		// Muestra el carrito
		
		displayCart: function() {
			var self = this;
			if( this.$formCart.length ) {
				var cart = this._toJSONObject( this.storage.getItem( this.cartName ) );
				var items = cart.items;
				var $tableCart = this.$formCart.find( "#cart-content" );
				var totalQty = 0;

				if( items.length == 0 ) {
				$tableCart.html( "<p>No hay productos en el carrito</p>" );
				} else {
					for( var i = 0; i < items.length; ++i ) {
						var item = items[i];
						var product = item.product;
						var price = item.price;
						var qty = item.qty;
						totalQty += item.qty;
						var img = item.img;

						var html = '<div class="cart-block" role"=group" aria-labelledby="nombre-prod" aria-describedby="cant-prod"><div class="row"><div class="col-4"><img src="' + img + '" alt="" class="cart-img" /></div>';
							 html += '<div class="col-8"><p class="pname" id="nombre-prod">' + product + '</p><p class="pprice only-red"> $ ' + price + '</p>';
							 html += '<div class="input-group qty-selector bg-white pqty"> <span class="input-group-btn"> <button type="button" class="btn btn-tiny btn-default btn-number" data-type="minus" data-field="quant[' + i + ']" aria-label="Restar producto"> <i class="fas fa-minus"></i> </button> </span> <input type="number" id="cant-prod" name="quant[' + i + ']" class="form-control qty-input qty input-number" aria-labelledby="cant-prod" value="' + qty + '" min="1" max="9" data-name="' + product + '" data-price="' + price + '" aria-live="polite"> <span class="input-group-btn"> <button type="button" class="btn btn-tiny btn-default btn-number" data-type="plus" data-field="quant[' + i + ']" aria-label="Sumar producto"> <i class="fas fa-plus"></i> </button> </span></div><span class="pdelete"><a href="#" aria-label="Quitar producto" data-product="' + product + '">&times;</a></span>';
               html += '</div></div></div>';
					
						$tableCart.html( $tableCart.html() + html );
					}

				}
				self.updateTotal();
			}
		},
		
		// Actualiza el carrito
		
		updateCart: function() {
			var self = this;
			
			$("#carrito").on("change", ".qty", function(event){
				var $blocks = self.$formCart.find( ".cart-block" );

				var updatedTotal = 0;
				var totalQty = 0;
				var updatedCart = {};
				updatedCart.items = [];

				$blocks.each(function() {
					var $block = $( this );
					var pname = $.trim( $block.find( ".pname" ).text() );
					var pqty = self._convertString( $block.find( ".pqty > .qty" ).val() );
					var pprice = self._convertString( self._extractPrice( $block.find( ".pprice" ) ) );
					var pimg = $block.find('.cart-img').attr('src');
					
					var cartObj = {
						product: pname,
						price: pprice,
						qty: pqty,
						img: pimg
					};
					
					updatedCart.items.push( cartObj );

				});
				self.storage.removeItem( self.cartName );
				self.storage.setItem( self.cartName, self._toJSONString( updatedCart ) );
				self.updateTotal();
			});
		},

		updateTotal: function () {
			self = this;
			var cart = self._toJSONObject( self.storage.getItem( self.cartName ) );
			var items = cart.items;
			
			if( items.length == 0 ) {
				$('.total .monto').find('span').html('').removeAttr('aria-label');
				$('main .bottom-fix').addClass('d-none');
				$('.nav-bar .badge').html('0 <span class="sr-only"> productos</span>').addClass('d-none');
			} else {

				for( var i = 0; i < items.length; ++i ) {
					var totalQty = 0;
					var item = items[i];
					var product = item.product;
					var price = item.price;
					var qty = item.qty;
					totalQty += item.qty;
					var discount = 0; // inicializar variable descuento
					if (qty % 3 == 0) { // si la cantidad es multiplo de 3, aplico la promoción
						discount = qty / 3;
						$('#promo').show();
					} else {
						if ( qty > 3 ) { // si la cantidad es mayor a 3 recalculo la cantidad con la promo
							discount = parseInt(qty/3);
							$('#promo').show();
						} else {
							$('#promo').hide();
						}
					}
					var total = (qty - discount) * price;
					total = self._decimals(total).split(".");
					$('.total .monto').find('span').html('$' + total[0] + '<sup>' + total[1] + '</sup>').attr('aria-label', '$'+total[0]+'.'+total[1]); // actualizo el container del precio
					self.storage.setItem( self.total, self._convertNumber( total ) );
					$('main .bottom-fix').removeClass('d-none');
					if ($('#cam_scan').length > 0) {
						$('#cam-scan').parent().removeClass('h-100').addClass('h-75');
					}
					$('.nav-bar .badge').html(totalQty + '<span class="sr-only"> productos</span>').removeClass('d-none');
				}
			}
		},
		
		// Agrega productos al carrito
		
		handleAddToCartForm: function() {
			var self = this;
			self.$formAddToCart.each(function() {
				self.updateTotal();
				var $form = $( this );
				var $btn = $form.find('.js-add-to-cart');
				var $product = $form.find('.qty-input');
				
				$btn.on( "click", function() {
					self._flyToElement( $('#prod-foto'), $('.nav-bar .fa-shopping-cart') );
					self._addToCart({
						product: $product.data( "name" ),
						price: self._convertString( $product.data( "price" ) ),
						qty: self._convertString( $product.val() ),
						img: $('#prod-foto').attr('src')
					});
					self.displayCart();
					self.updateTotal();
				});
			});
		},

		// Actualiza notificaciones
		showNotifications: function () {
			var self = this;
			var not = self.storage.getItem('notifications');
			if (not == null) {
				self.storage.setItem('notifications', 1);
			} 
			if (not == 0) {
				$('.notifications').attr('aria-label', 'Sin Notificaciones').find('.badge').remove();
			} else {
				$('.notifications').attr('aria-label', not + ' Notificaciones sin leer').find('.badge').html(not);	
			}
		},

		updateNotifications: function () {
			var self = this;
			$('#not1').on('closed.bs.alert', function () {
				self.storage.setItem('notifications', 0);
				$('.notifications').attr('title', 'Sin Notificaciones').find('.badge').remove();
			});
		},
		
		
		// Métodos privados
		
		// Vuela al carrito

		_flyToElement: function(flyer, flyingTo) {
			var $func = $(this);
			var divider = 3;
			var flyerClone = $(flyer).clone();
			$(flyerClone).css({position: 'absolute', top: $(flyer).offset().top + "px", left: $(flyer).offset().left + "px", opacity: 1, 'z-index': 1000});
			$('body').append($(flyerClone));
			var gotoX = $(flyingTo).offset().left + ($(flyingTo).width() / 2) - ($(flyer).width()/divider)/2;
			var gotoY = $(flyingTo).offset().top + ($(flyingTo).height() / 2) - ($(flyer).height()/divider)/2;
			 
			$(flyerClone).animate({
					opacity: 0.4,
					left: gotoX,
					top: gotoY,
					width: $(flyer).width()/divider,
					height: $(flyer).height()/divider
			}, 700,
			function () {
					$(flyingTo).fadeOut('fast', function () {
							$(flyingTo).fadeIn('fast', function () {
									$(flyerClone).fadeOut('fast', function () {
											$(flyerClone).remove();
									});
							});
					});
			});
		},
		
		// Vacía session storage
		
		_emptyCart: function() {
			this.storage.clear();
		},
		
		/* Format a number by decimal places
		 * @param num Number the number to be formatted
		 * @param places Number the decimal places
		 * @returns n Number the formatted number
		 */
		 
		 
		
		_formatNumber: function( num, places ) {
			var n = num.toFixed( places );
			return n;
		},
		
		/* Extract the numeric portion from a string
		 * @param element Object the jQuery element that contains the relevant string
		 * @returns price String the numeric string
		 */
		
		
		_extractPrice: function( element ) {
			var self = this;
			var text = element.text();
			var price = text.replace( self.currency, "" ).replace( " ", "" );
			return price;
		},
		
		/* Converts a numeric string into a number
		 * @param numStr String the numeric string to be converted
		 * @returns num Number the number
		 */
		
		_convertString: function( numStr ) {
			var num;
			if( /^[-+]?[0-9]+\.[0-9]+$/.test( numStr ) ) {
				num = parseFloat( numStr );
			} else if( /^\d+$/.test( numStr ) ) {
				num = parseInt( numStr, 10 );
			} else {
				num = Number( numStr );
			}
			
			if( !isNaN( num ) ) {
				return num;
			} else {
				console.warn( numStr + " cannot be converted into a number" );
				return false;
			}
		},
		
		/* Converts a number to a string
		 * @param n Number the number to be converted
		 * @returns str String the string returned
		 */
		
		_convertNumber: function( n ) {
			var str = n.toString();
			return str;
		},
		
		/* Converts a JSON string to a JavaScript object
		 * @param str String the JSON string
		 * @returns obj Object the JavaScript object
		 */
		
		_toJSONObject: function( str ) {
			var obj = JSON.parse( str );
			return obj;
		},
		
		/* Converts a JavaScript object to a JSON string
		 * @param obj Object the JavaScript object
		 * @returns str String the JSON string
		 */
		
		
		_toJSONString: function( obj ) {
			var str = JSON.stringify( obj );
			return str;
		},
		
		
		/* Add an object to the cart as a JSON string
		 * @param values Object the object to be added to the cart
		 * @returns void
		 */
		
		
		_addToCart: function( values ) {
			var cart = this.storage.getItem( this.cartName );
			
			var cartObject = this._toJSONObject( cart );
			var cartCopy = cartObject;
			var items = cartCopy.items;
			if ($(cartCopy.items).length > 0) {
				$(cartCopy.items).each( function() {
					if ( this.product == values.product ) {
						values.qty += this.qty; 
						items.pop( this );
					}
				})
			}
			items.push( values );
			
			this.storage.setItem( this.cartName, this._toJSONString( cartCopy ) );
		},
		
		_decimals: function ( value ) {
			return Number.parseFloat(value).toFixed(2);
		},

	};
	
	$(function() {
		var shop = new $.Shop( "body" );
	});

})( jQuery );