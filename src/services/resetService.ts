import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

export async function resetDatabaseData() {
  const collectionsToClear = [
    'purchase_orders',
    'sales_orders',
    'master_products',
    'warehouse_items',
    'wms_inventory',
    'notifications'
  ];

  try {
    // 1. Delete all existing records in batch
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // 2. Seed Fresh Clean Initial Data
    const batch = writeBatch(db);

    // Seed Purchase Orders
    const samplePOs = [
      {
        id: 'PO-2026-001',
        clientName: 'PT Sukses Sandang',
        deadline: '2026-06-30',
        note: 'Order Prioritas Utama untuk Event Nasional',
        status: 'Approved',
        createdDate: '2026-06-01',
        items: [
          { productName: 'Kaos Polos Combed 30s', price: 45000, quantities: { L: 500 } },
          { productName: 'Kemeja Drill Tactical', price: 125000, quantities: { XL: 200 } }
        ]
      },
      {
        id: 'PO-2026-002',
        clientName: 'CV Maju Jaya Garment',
        deadline: '2026-07-15',
        note: 'Pengiriman bertahap 2 gelombang',
        status: 'Approved',
        createdDate: '2026-06-05',
        items: [
          { productName: 'Polo Shirt Lacoste CVC', price: 65000, quantities: { M: 300 } }
        ]
      },
      {
        id: 'PO-2026-003',
        clientName: 'PT Nusantara Style',
        deadline: '2026-07-25',
        note: 'Sampel bahan sudah disetujui pemesan',
        status: 'Draft',
        createdDate: '2026-06-10',
        items: [
          { productName: 'Jaket Parka Canvas', price: 175000, quantities: { L: 150 } }
        ]
      }
    ];

    samplePOs.forEach(po => {
      const docRef = doc(db, 'purchase_orders', po.id);
      batch.set(docRef, po);
    });

    // Seed Sales Orders (WIP)
    const sampleSOs = [
      {
        id: 'SO-2026-001-A',
        client: 'PT Sukses Sandang',
        poNumber: 'PO-2026-001',
        product: 'Kaos Polos Combed 30s',
        qty: 200,
        stage: 'Cutting',
        vendor: 'Pabrik Utama',
        deadline: '30 Juni 2026',
        status: 'On Process',
        note: 'Potongan bahan ukuran L',
        qtyKirim: '200',
        tglKirim: '2026-06-02',
        qtyMasuk: '200',
        target: '200',
        aktual: '200',
        selisih: '0',
        confirmQty: 200
      },
      {
        id: 'SO-2026-001-B',
        client: 'PT Sukses Sandang',
        poNumber: 'PO-2026-001',
        product: 'Kaos Polos Combed 30s',
        qty: 300,
        stage: 'Sablon',
        vendor: 'Subkon Sablon Mandiri',
        deadline: '30 Juni 2026',
        status: 'On Process',
        note: 'Sablon Plastisol Depan & Belakang',
        qtyKirim: '300',
        tglKirim: '2026-06-04',
        qtyMasuk: '300',
        target: '300',
        aktual: '300',
        selisih: '0',
        confirmQty: 300
      },
      {
        id: 'SO-2026-002-A',
        client: 'CV Maju Jaya Garment',
        poNumber: 'PO-2026-002',
        product: 'Polo Shirt Lacoste CVC',
        qty: 150,
        stage: 'Bordir',
        vendor: 'Bordir Komputer Sejahtera',
        deadline: '15 Juli 2026',
        status: 'On Process',
        note: 'Bordir Logo Dada Kiri & Lengan',
        qtyKirim: '150',
        tglKirim: '2026-06-08',
        qtyMasuk: '150',
        target: '150',
        aktual: '150',
        selisih: '0',
        confirmQty: 150
      },
      {
        id: 'SO-2026-002-B',
        client: 'CV Maju Jaya Garment',
        poNumber: 'PO-2026-002',
        product: 'Polo Shirt Lacoste CVC',
        qty: 150,
        stage: 'Sewing',
        vendor: 'Line Sewing 2',
        deadline: '15 Juli 2026',
        status: 'On Process',
        note: 'Penjahitan kerah rib & kancing',
        qtyKirim: '150',
        tglKirim: '2026-06-10',
        qtyMasuk: '150',
        target: '150',
        aktual: '150',
        selisih: '0',
        confirmQty: 150
      },
      {
        id: 'SO-2026-003-A',
        client: 'PT Nusantara Style',
        poNumber: 'PO-2026-003',
        product: 'Jaket Parka Canvas',
        qty: 150,
        stage: 'Patterning',
        vendor: 'Desain & Pola Utama',
        deadline: '25 Juli 2026',
        status: 'Pending',
        note: 'Pola parka hooded dengan furing',
        qtyKirim: '0',
        tglKirim: '-',
        qtyMasuk: '0',
        target: '150',
        aktual: '0',
        selisih: '150',
        confirmQty: 0
      },
      {
        id: 'SO-2026-004-QC',
        client: 'PT Sukses Sandang',
        poNumber: 'PO-2026-001',
        product: 'Kemeja Drill Tactical',
        qty: 100,
        stage: 'QC',
        vendor: 'Tim QC Internal',
        deadline: '30 Juni 2026',
        status: 'On Process',
        note: 'Inspeksi kerapihan jahitan & kancing',
        qtyKirim: '100',
        tglKirim: '2026-06-12',
        qtyMasuk: '100',
        target: '100',
        aktual: '100',
        selisih: '0',
        confirmQty: 100
      },
      {
        id: 'SO-2026-005-FIN',
        client: 'PT Sukses Sandang',
        poNumber: 'PO-2026-001',
        product: 'Kemeja Drill Tactical',
        qty: 100,
        stage: 'Selesai',
        vendor: 'Packing & Gudang',
        deadline: '20 Juni 2026',
        status: 'Selesai',
        note: 'Lolos QC & siap dikirim ke pemesan',
        qtyKirim: '100',
        tglKirim: '2026-06-15',
        qtyMasuk: '100',
        target: '100',
        aktual: '100',
        selisih: '0',
        confirmQty: 100
      }
    ];

    sampleSOs.forEach(so => {
      const docRef = doc(db, 'sales_orders', so.id);
      batch.set(docRef, so);
    });

    // Seed Master Products
    const sampleProducts = [
      {
        id: 'MP-001',
        name: 'Kaos Polos Combed 30s',
        category: 'T-Shirt',
        bom: [
          { material: 'Kain Cotton Combed 30s Reaktif Black', qty: '0.25', unit: 'Kg' },
          { material: 'Benang Sewing Cotton White 40/2', qty: '1', unit: 'Cone' },
          { material: 'Plastik Packing OPP 30x40 Seal', qty: '1', unit: 'Pcs' }
        ]
      },
      {
        id: 'MP-002',
        name: 'Kemeja Drill Tactical',
        category: 'Kemeja',
        bom: [
          { material: 'Kain Drill American Navy', qty: '1.5', unit: 'Meter' },
          { material: 'Kancing Kemeja 18L Black', qty: '8', unit: 'Pcs' },
          { material: 'Resleting Nylon 15cm', qty: '2', unit: 'Pcs' }
        ]
      },
      {
        id: 'MP-003',
        name: 'Polo Shirt Lacoste CVC',
        category: 'Polo',
        bom: [
          { material: 'Kain Lacoste CVC 24s Navy', qty: '0.35', unit: 'Kg' },
          { material: 'Kerah & Manset Rib', qty: '1', unit: 'Set' },
          { material: 'Kancing Kemeja 18L Black', qty: '3', unit: 'Pcs' }
        ]
      },
      {
        id: 'MP-004',
        name: 'Jaket Parka Canvas',
        category: 'Jacket',
        bom: [
          { material: 'Kain Canvas Marsoto Olive', qty: '2.0', unit: 'Meter' },
          { material: 'Furing Asahi Black', qty: '1.5', unit: 'Meter' },
          { material: 'Resleting Besi YKK 70cm', qty: '1', unit: 'Pcs' }
        ]
      }
    ];

    sampleProducts.forEach(mp => {
      const docRef = doc(db, 'master_products', mp.id);
      batch.set(docRef, mp);
    });

    // Seed Warehouse Items
    const sampleWarehouseItems = [
      {
        id: 'WH-001',
        kode: 'MAT-FAB-001',
        name: 'Kain Cotton Combed 30s Reaktif Black',
        jenis: 'Kain / Fabric',
        satuan: 'Kg',
        totalStok: 450,
        allocated: 120,
        lokasiRak: 'A-01-2',
        supplier: 'PT Kusumah Tex',
        isiKemasan: '25 Kg/Roll',
        hargaPartai: 110000,
        hargaEcer: 115000
      },
      {
        id: 'WH-002',
        kode: 'MAT-FAB-002',
        name: 'Kain Drill American Navy',
        jenis: 'Kain / Fabric',
        satuan: 'Meter',
        totalStok: 800,
        allocated: 300,
        lokasiRak: 'B-02-1',
        supplier: 'CV Sinar Textile',
        isiKemasan: '50 Meter/Roll',
        hargaPartai: 32000,
        hargaEcer: 35000
      },
      {
        id: 'WH-003',
        kode: 'MAT-ACC-001',
        name: 'Kancing Kemeja 18L Black',
        jenis: 'Aksesori',
        satuan: 'Gross',
        totalStok: 120,
        allocated: 25,
        lokasiRak: 'C-01-4',
        supplier: 'PT Trimitra Aksesori',
        isiKemasan: '1 Gross/Pack',
        hargaPartai: 15000,
        hargaEcer: 18000
      },
      {
        id: 'WH-004',
        kode: 'MAT-THR-001',
        name: 'Benang Sewing Cotton White 40/2',
        jenis: 'Benang',
        satuan: 'Cone',
        totalStok: 85,
        allocated: 15,
        lokasiRak: 'D-03-2',
        supplier: 'PT Astra Benang',
        isiKemasan: '5000 Yards/Cone',
        hargaPartai: 18000,
        hargaEcer: 20000
      },
      {
        id: 'WH-005',
        kode: 'MAT-PAC-001',
        name: 'Plastik Packing OPP 30x40 Seal',
        jenis: 'Kemasan',
        satuan: 'Pack',
        totalStok: 200,
        allocated: 50,
        lokasiRak: 'E-01-1',
        supplier: 'CV Plastik Jaya',
        isiKemasan: '100 Pcs/Pack',
        hargaPartai: 12000,
        hargaEcer: 14000
      }
    ];

    sampleWarehouseItems.forEach(item => {
      const docRef = doc(db, 'warehouse_items', item.id);
      batch.set(docRef, item);
    });

    // Seed Notifications
    const sampleNotifications = [
      {
        id: 'NOTIF-001',
        message: 'Database berhasil di-reset & diinisialisasi ulang.',
        role: 'System',
        createdAt: new Date().toISOString()
      },
      {
        id: 'NOTIF-002',
        message: 'Order SO-2026-001-A telah diperbarui ke tahap Cutting.',
        role: 'Owner',
        createdAt: new Date().toISOString()
      }
    ];

    sampleNotifications.forEach(notif => {
      const docRef = doc(db, 'notifications', notif.id);
      batch.set(docRef, notif);
    });

    // Commit batch
    await batch.commit();

    // Clear local storage if any
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }

    return { success: true, message: 'Database Parahita ERP berhasil di-reset!' };
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, 'reset_database');
    return { success: false, message: 'Gagal melakukan reset database.' };
  }
}
