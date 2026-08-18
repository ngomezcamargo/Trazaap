# Generacion local de codigos QR

Los QR del reporte de trazabilidad se renderizan en el navegador mediante
`qrcode.react`. El contenido es la URL local `/verificar/[lote]`; no se envia
el lote ni la URL a servicios externos.

La hoja de impresion fija un area minima de 2 x 2 cm y conserva una zona
blanca alrededor del simbolo. La legibilidad, el tamano fisico resultante y
la calidad de impresion deben comprobarse posteriormente con las impresoras,
etiquetas y lectores reales. El uso de la libreria no constituye por si solo
una certificacion ISO/IEC 18004.
