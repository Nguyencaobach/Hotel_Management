const ProductManager = {
	apiBaseUrl: "/api/products",
	categoryApiUrl: "/api/categories",
	isInitialized: false,
	currentProductId: null, // Lưu ID sản phẩm đang mở Modal Lô hàng

	init() {
		document
			.querySelectorAll(".dashboard-module")
			.forEach((m) => (m.style.display = "none"));
		document.getElementById("product-management-module").style.display =
			"block";

		if (!this.isInitialized) {
			// Sự kiện In và Quét mã
			document
				.getElementById("btnPrintBarcode")
				.addEventListener("click", () => this.printBarcode());
			document
				.getElementById("btnScanBarcode")
				.addEventListener("click", () => this.openScannerModal());

			// Tắt camera khi đóng modal quét
			document
				.getElementById("scannerModal")
				.addEventListener("hidden.bs.modal", () => {
					if (this.html5QrcodeScanner) {
						this.html5QrcodeScanner.clear();
					}
				});

			// Sự kiện Sản phẩm
			document
				.getElementById("btnAddProduct")
				.addEventListener("click", () => this.showProductModal());
			document
				.getElementById("btnSaveProduct")
				.addEventListener("click", () => this.saveProduct());
			document
				.getElementById("searchProduct")
				.addEventListener("input", (e) =>
					this.handleSearch(e.target.value),
				);

			// Sự kiện Lô hàng
			document
				.getElementById("btnSaveBatch")
				.addEventListener("click", () => this.saveBatch());
			document
				.getElementById("btnCancelEditBatch")
				.addEventListener("click", () => this.resetBatchForm());

			// Sự kiện Xóa chung
			document
				.getElementById("btnConfirmDeleteProduct")
				.addEventListener("click", () => this.executeDelete());

			// Khi tắt Modal Batch, load lại bảng Product để cập nhật Tổng tồn kho
			document
				.getElementById("batchModal")
				.addEventListener("hidden.bs.modal", () => {
					this.loadProducts();
				});

			// =========================================================
			// SỰ KIỆN AUTO-FORMAT TIỀN & CHẶN KÝ TỰ, DẤU ÂM
			// =========================================================
			const formatInputCurrency = (e) => {
				let val = e.target.value;
				if (val !== "") {
					val = parseInt(val, 10).toLocaleString("vi-VN"); // Thêm dấu chấm hàng nghìn
				}
				e.target.value = val;
			};

			const formatInputNumberOnly = (e) => {
				// Chỉ dành cho Số lượng (Không có dấu chấm hàng nghìn, không âm)
			};

			// Gắn sự kiện lắng nghe khi gõ phím
			document
				.getElementById("prodRetailPrice")
				.addEventListener("input", formatInputCurrency);
			document
				.getElementById("batchImportPrice")
				.addEventListener("input", formatInputCurrency);
			document
				.getElementById("batchQuantity")
				.addEventListener("input", formatInputNumberOnly);

			this.isInitialized = true;
		}

		this.loadCategories(); // Tải danh mục vào thẻ <select>
		this.loadProducts();
	},

	// ==========================================
	// SẢN PHẨM GỐC
	// ==========================================
	async loadCategories() {
		try {
			const res = await fetch(this.categoryApiUrl);
			const json = await res.json();
			const select = document.getElementById("prodCategory");
			select.innerHTML =
				'<option value="">-- Chọn danh mục --</option>' +
				json.data
					.map(
						(c) =>
							`<option value="${c.category_id}">${c.name}</option>`,
					)
					.join("");
		} catch (e) {
			console.error("Lỗi tải danh mục");
		}
	},

	async loadProducts() {
		try {
			const res = await fetch(this.apiBaseUrl);
			const json = await res.json();
			window.allProducts = json.data;
			this.renderProductTable(window.allProducts);
		} catch (err) {
			document.getElementById("productTableBody").innerHTML =
				`<tr><td colspan="7" class="text-center text-danger">Lỗi tải dữ liệu!</td></tr>`;
		}
	},

	handleSearch(keyword) {
		const lower = keyword.toLowerCase().trim();
		const filtered = window.allProducts.filter(
			(item) =>
				(item.name || "").toLowerCase().includes(lower) ||
				(item.sku || "").toLowerCase().includes(lower),
		);
		this.renderProductTable(filtered);
	},

	renderProductTable(data) {
		const tbody = document.getElementById("productTableBody");
		if (!data || data.length === 0) {
			tbody.innerHTML =
				'<tr><td colspan="7" class="text-center text-muted">Không có sản phẩm nào.</td></tr>';
			return;
		}

		tbody.innerHTML = data
			.map((item) => {
				// Hiển thị màu đỏ nếu hết hàng
				const qtyClass =
					item.total_quantity > 0
						? 'fw-bold" style="color: #015CE0;'
						: "text-danger fw-bold";

				return `
            <tr>
                <td class="text-muted">${item.sku}</td>
                <td class="fw-bold text-dark">${item.name}</td>
                <td><span class="badge bg-secondary">${item.category_name || "Chưa phân loại"}</span></td>
                <td>${item.unit}</td>
                <td>${Number(item.retail_price).toLocaleString("vi-VN")} đ</td>
                <td class="text-center ${qtyClass} fs-5">${item.total_quantity}</td>
                <td class="text-end">
                    <button class="btn btn-sm me-1" style="background-color: #015CE0; border-color: #015CE0; color: white;" onclick="ProductManager.openBatchModal('${item.product_id}', '${item.name.replace(/'/g, "\\'")}')" title="Nhập kho / Quản lý lô">
                        <i class="fa-solid fa-box-open"></i> Nhập hàng
                    </button>
                    <button class="btn btn-sm me-1" style="background-color: #17a2b8; border-color: #17a2b8; color: white;" onclick="ProductManager.showBarcodeModal('${item.sku}', '${item.name.replace(/'/g, "\\'")}')" title="Tạo & In mã vạch">
                        <i class="fa-solid fa-barcode"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="ProductManager.clickEditProduct('${item.product_id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="ProductManager.confirmDelete('${item.product_id}', 'product')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
			})
			.join("");
	},

	showProductModal(
		id = "",
		sku = "",
		name = "",
		category_id = "",
		unit = "",
		retail_price = "0",
	) {
		document.getElementById("prodId").value = id;
		document.getElementById("prodSku").value = sku;
		document.getElementById("prodName").value = name;
		document.getElementById("prodCategory").value = category_id || "";
		document.getElementById("prodUnit").value = unit;

		// Đưa giá tiền lên giao diện và Format sẵn
		document.getElementById("prodRetailPrice").value = retail_price
			? Number(retail_price).toLocaleString("vi-VN")
			: "0";

		document.getElementById("productModalLabel").textContent = id
			? "Cập nhật sản phẩm"
			: "Thêm sản phẩm mới";
		bootstrap.Modal.getOrCreateInstance(
			document.getElementById("productModal"),
		).show();
	},

	clickEditProduct(id) {
		const item = window.allProducts.find((p) => p.product_id === id);
		if (item)
			this.showProductModal(
				item.product_id,
				item.sku,
				item.name,
				item.category_id,
				item.unit,
				item.retail_price,
			);
	},

	async saveProduct() {
		const id = document.getElementById("prodId").value;

		// Loại bỏ ký tự thừa (dấu chấm) trước khi gửi xuống DB
		const rawRetailPriceStr = document.getElementById("prodRetailPrice");

		const payload = {
			sku: document.getElementById("prodSku").value,
			name: document.getElementById("prodName").value,
			category_id: document.getElementById("prodCategory").value,
			unit: document.getElementById("prodUnit").value,
			retail_price: parseInt(rawRetailPriceStr || 0, 10),
		};

		const method = id ? "PUT" : "POST";
		const url = id ? `${this.apiBaseUrl}/${id}` : this.apiBaseUrl;

		try {
			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (res.ok) {
				bootstrap.Modal.getInstance(
					document.getElementById("productModal"),
				).hide();
				showNotify(
					id
						? "Cập nhật sản phẩm thành công!"
						: "Thêm sản phẩm thành công!",
				);
				this.loadProducts();
			} else {
				const err = await res.json();
				showNotify(err.error || "Lỗi lưu sản phẩm!", "error");
			}
		} catch (e) {
			showNotify("Lỗi kết nối server!", "error");
		}
	},

	// ==========================================
	// LÔ HÀNG (BATCHES)
	// ==========================================
	openBatchModal(productId, productName) {
		this.currentProductId = productId;
		document.getElementById("batchProductName").textContent = productName;
		this.resetBatchForm();
		this.loadBatches();
		bootstrap.Modal.getOrCreateInstance(
			document.getElementById("batchModal"),
		).show();
	},

	async loadBatches() {
		try {
			const res = await fetch(
				`${this.apiBaseUrl}/${this.currentProductId}/batches`,
			);
			const json = await res.json();
			window.currentBatches = json.data;
			this.renderBatchTable(window.currentBatches);
		} catch (e) {
			console.error("Lỗi tải lô hàng");
		}
	},

	renderBatchTable(data) {
		const tbody = document.getElementById("batchTableBody");
		if (!data || data.length === 0) {
			tbody.innerHTML =
				'<tr><td colspan="8" class="text-center text-muted py-3">Chưa có lô hàng nào. Hãy nhập hàng.</td></tr>';
			return;
		}

		// Lấy ngày hôm nay để làm mốc so sánh
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		tbody.innerHTML = data
			.map((item) => {
				const importDate = item.import_date
					? new Date(item.import_date).toLocaleDateString("vi-VN")
					: "";
				const mfgDate = item.mfg_date
					? new Date(item.mfg_date).toLocaleDateString("vi-VN")
					: "";

				// 1. XỬ LÝ HẠN SỬ DỤNG & BADGE HẾT HẠN
				let expDateHTML = '<span class="text-muted">Không có</span>';
				let isExpired = false;

				if (item.exp_date) {
					const expDateObj = new Date(item.exp_date);
					expDateHTML = expDateObj.toLocaleDateString("vi-VN");

					// Nếu ngày hết hạn < ngày hôm nay -> Gắn cờ hết hạn
					expDateObj.setHours(0, 0, 0, 0);
					if (expDateObj < today) {
						isExpired = true;
						expDateHTML += `<br><span class="badge bg-danger mt-1" style="font-size: 0.75rem;"><i class="fa-solid fa-triangle-exclamation me-1"></i>Đã hết hạn</span>`;
					}
				}

				// 2. HIGHLIGHT SỐ LƯỢNG (Nếu hết date mà vẫn còn hàng thì gạch ngang đi)
				let qtyStyle = "fw-bold text-primary";
				if (item.quantity === 0) {
					qtyStyle = "text-danger text-decoration-line-through";
				} else if (isExpired) {
					qtyStyle = "text-muted text-decoration-line-through";
				}

				// Nếu lô hàng đã hết date, làm mờ cả dòng đó cho dễ nhìn
				const rowClass = isExpired ? "table-light text-muted" : "";

				return `
            <tr class="${rowClass}">
                <td class="text-muted">${item.batch_code || "-"}</td>
                <td>${importDate}</td>
                <td class="${qtyStyle}">${item.quantity}</td>
                <td>${Number(item.import_price).toLocaleString("vi-VN")} đ</td>
                <td>${mfgDate}</td>
                <td class="fw-bold text-danger">${expDateHTML}</td>
                <td>${item.supplier || "-"}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-light text-warning" onclick="ProductManager.clickEditBatch('${item.batch_id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-light text-danger" onclick="ProductManager.confirmDelete('${item.batch_id}', 'batch')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
			})
			.join("");
	},

	resetBatchForm() {
		document.getElementById("batchId").value = "";
		document.getElementById("batchCode").value = "";
		document.getElementById("batchQuantity").value = "";
		document.getElementById("batchImportPrice").value = "0";
		document.getElementById("batchMfg").value = "";
		document.getElementById("batchExp").value = "";
		document.getElementById("batchSupplier").value = "";

		document.getElementById("batchFormTitle").textContent =
			"Nhập lô hàng mới";
		document.getElementById("btnSaveBatch").innerHTML =
			'<i class="fa-solid fa-download me-1"></i> Lưu lô hàng';
		document
			.getElementById("btnSaveBatch")
			.classList.replace("btn-warning", "btn-success");
		document.getElementById("btnCancelEditBatch").classList.add("d-none");
	},

	clickEditBatch(batchId) {
		const item = window.currentBatches.find((b) => b.batch_id === batchId);
		if (!item) return;

		document.getElementById("batchId").value = item.batch_id;
		document.getElementById("batchCode").value = item.batch_code || "";
		document.getElementById("batchQuantity").value = item.quantity;

		// Định dạng tiền tệ khi bấm Sửa
		document.getElementById("batchImportPrice").value = item.import_price
			? Number(item.import_price).toLocaleString("vi-VN")
			: "0";

		document.getElementById("batchMfg").value = item.mfg_date
			? item.mfg_date.split("T")[0]
			: "";
		document.getElementById("batchExp").value = item.exp_date
			? item.exp_date.split("T")[0]
			: "";
		document.getElementById("batchSupplier").value = item.supplier || "";

		document.getElementById("batchFormTitle").textContent =
			"Sửa thông tin lô hàng";
		document.getElementById("btnSaveBatch").innerHTML =
			'<i class="fa-solid fa-check me-1"></i> Cập nhật';
		document
			.getElementById("btnSaveBatch")
			.classList.replace("btn-success", "btn-warning");
		document
			.getElementById("btnCancelEditBatch")
			.classList.remove("d-none");
	},

	async saveBatch() {
		const batchId = document.getElementById("batchId").value;

		// KIỂM TRA BẮT BUỘC: Không cho phép nhập lô hàng có Date trong quá khứ
		const expDateValue = document.getElementById("batchExp").value;
		if (expDateValue) {
			const exp = new Date(expDateValue);
			const today = new Date();
			today.setHours(0, 0, 0, 0); // Reset giờ về 0 để chỉ so sánh ngày

			if (exp < today) {
				return showNotify(
					"Lỗi: Hạn sử dụng không được nhỏ hơn ngày hôm nay!",
					"error",
				);
			}
		}

		// Loại bỏ ký tự thừa, chỉ lấy số trước khi gửi xuống DB
		const rawQtyStr = document.getElementById("batchQuantity");
		const rawImportPriceStr = document.getElementById("batchImportPrice");

		const payload = {
			batch_code: document.getElementById("batchCode").value,
			quantity: parseInt(rawQtyStr || 0, 10),
			import_price: parseInt(rawImportPriceStr || 0, 10),
			mfg_date: document.getElementById("batchMfg").value || null,
			exp_date: expDateValue || null,
			supplier: document.getElementById("batchSupplier").value,
		};

		const method = batchId ? "PUT" : "POST";
		const url = batchId
			? `${this.apiBaseUrl}/batches/${batchId}`
			: `${this.apiBaseUrl}/${this.currentProductId}/batches`;

		try {
			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (res.ok) {
				showNotify(
					batchId
						? "Cập nhật lô hàng thành công!"
						: "Nhập lô hàng thành công!",
				);
				this.resetBatchForm();
				this.loadBatches();
			} else {
				const err = await res.json();
				showNotify(err.error || "Lỗi lưu lô hàng!", "error");
			}
		} catch (e) {
			showNotify("Lỗi kết nối server!", "error");
		}
	},

	// ==========================================
	// XÓA CHUNG (PRODUCT / BATCH)
	// ==========================================
	confirmDelete(id, type) {
		document.getElementById("deleteProductTargetId").value = id;
		document.getElementById("deleteProductTargetType").value = type;
		document.getElementById("deleteProductMsg").textContent =
			type === "product"
				? "Xóa sản phẩm này sẽ xóa toàn bộ các đợt nhập hàng của nó. Bạn có chắc chắn không?"
				: "Bạn có chắc chắn muốn xóa đợt nhập hàng này không?";

		bootstrap.Modal.getOrCreateInstance(
			document.getElementById("deleteProductModal"),
		).show();
	},

	async executeDelete() {
		const id = document.getElementById("deleteProductTargetId").value;
		const type = document.getElementById("deleteProductTargetType").value;
		const url =
			type === "product"
				? `${this.apiBaseUrl}/${id}`
				: `${this.apiBaseUrl}/batches/${id}`;

		try {
			const res = await fetch(url, { method: "DELETE" });
			if (res.ok) {
				bootstrap.Modal.getInstance(
					document.getElementById("deleteProductModal"),
				).hide();
				showNotify(
					type === "product"
						? "Xóa sản phẩm thành công!"
						: "Xóa lô hàng thành công!",
				);
				if (type === "product") this.loadProducts();
				else this.loadBatches();
			} else showNotify("Lỗi khi xóa!", "error");
		} catch (e) {
			showNotify("Lỗi kết nối server!", "error");
		}
	},

	// ==========================================
	// CHỨC NĂNG BARCODE & SCANNER
	// ==========================================

	// 1. Hiển thị Modal và tạo hình mã vạch
	showBarcodeModal(sku, name) {
		document.getElementById("printBarcodeName").textContent = name;

		// Gọi thư viện JsBarcode để vẽ mã vạch chuẩn CODE128
		JsBarcode("#barcodeCanvas", sku, {
			format: "CODE128",
			lineColor: "#000",
			width: 2,
			height: 80,
			displayValue: true, // Hiển thị số SKU ở dưới mã vạch
			fontSize: 16,
		});

		bootstrap.Modal.getOrCreateInstance(
			document.getElementById("barcodeModal"),
		).show();
	},

	// 2. Chức năng In chỉ riêng cái mã vạch (Không in cả trang web)
	printBarcode() {
		const printContent =
			document.getElementById("printBarcodeArea").innerHTML;
		const originalContent = document.body.innerHTML;

		// Đổi nội dung web thành mỗi cái mã vạch rồi gọi lệnh In
		document.body.innerHTML = `<div style="text-align: center; margin-top: 50px;">${printContent}</div>`;
		window.print();

		// Khôi phục lại trang web sau khi in xong
		document.body.innerHTML = originalContent;
		location.reload(); // Reload nhẹ để load lại JS
	},

	// 3. Chức năng bật Camera quét mã
	html5QrcodeScanner: null,
	openScannerModal() {
		bootstrap.Modal.getOrCreateInstance(
			document.getElementById("scannerModal"),
		).show();

		// Khởi tạo máy quét (Chỉ quét Barcode chuẩn như CODE_128, EAN)
		this.html5QrcodeScanner = new Html5QrcodeScanner(
			"reader",
			{ fps: 10, qrbox: { width: 250, height: 150 } },
			false,
		);

		this.html5QrcodeScanner.render(
			(decodedText) => {
				// Khi quét thành công:
				// 1. Kêu tiếng Bíp (Tùy chọn)
				// 2. Tự động điền mã SKU vào ô tìm kiếm
				document.getElementById("searchProduct").value = decodedText;

				// 3. Tự động chạy lệnh tìm kiếm
				this.handleSearch(decodedText);

				// 4. Tắt máy quét và đóng Modal
				this.html5QrcodeScanner.clear();
				bootstrap.Modal.getInstance(
					document.getElementById("scannerModal"),
				).hide();
			},
			(errorMessage) => {
				// Bỏ qua lỗi trong lúc đang dò mã
			},
		);
	},
};

window.ProductManager = ProductManager;
