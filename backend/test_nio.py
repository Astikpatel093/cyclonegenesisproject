import unittest
from unittest.mock import patch
from tempfile import TemporaryDirectory
from pathlib import Path
import nio
import imd_satellite as satellite

class NIOTests(unittest.TestCase):
    def test_bounds_and_boundary(self):
        for lat,lon,expected in [(5,50,'Arabian Sea'),(26,99,'Bay of Bengal'),(12,77,'Bay of Bengal'),(12,76.99,'Arabian Sea'),(4.9,60,None),(27,80,None),(12,100,None),(float('nan'),60,None)]:
            self.assertEqual(nio.sub_region(lat,lon),expected)
    def test_thresholds(self):
        for wind,expected in [(0,'Low Pressure Area'),(16.99,'Low Pressure Area'),(17,'Depression'),(27.99,'Depression'),(28,'Deep Depression'),(34,'Cyclonic Storm'),(48,'Severe Cyclonic Storm'),(64,'Very Severe Cyclonic Storm'),(90,'Extremely Severe Cyclonic Storm'),(120,'Super Cyclonic Storm'),(None,'Unavailable')]:
            self.assertEqual(nio.imd_classification(wind),expected)
    def test_units_and_ist(self):
        self.assertAlmostEqual(nio.wind_knots(185.2,'km/h'),100)
        self.assertIsNone(nio.wind_knots(-1))
        result=nio.normalized_storm({'name':'Test','currentPosition':{'lat':15,'lon':85,'windSpeed':50,'pressure':990,'timestamp':'2026-10-02T23:00:00Z'}})
        self.assertEqual(result['last_observed_ist'],'2026-10-03T04:30:00+05:30')
        self.assertEqual(result['imd_classification'],'Severe Cyclonic Storm')
    def setUp(self):
        satellite.cache.clear()
    def test_shared_image_not_mislabeled(self):
        with patch.object(satellite,'read_url',return_value=(b'<img src="../../Satellite/rswmo_ir1.jpg">','text/html')):
            self.assertIsNone(satellite.fetch_imd_satellite('Bay of Bengal')['satellite_img_url'])
    def test_html_never_saved_as_jpeg(self):
        with patch.object(satellite,'read_url',side_effect=[(b'<img src="/BOB_IR1.jpg">','text/html'),(b'<html>error</html>','text/html')]):
            self.assertEqual(satellite.fetch_imd_satellite('Bay of Bengal')['status'],'unavailable')
    def test_verified_regional_jpeg(self):
        with TemporaryDirectory() as directory, patch.object(satellite,'DIRECTORY',Path(directory)), patch.object(satellite,'read_url',side_effect=[(b'<img src="/BOB_IR1.jpg">','text/html'),(b'\xff\xd8\xffsample\xff\xd9','image/jpeg')]):
            result=satellite.fetch_imd_satellite('Bay of Bengal')
            self.assertEqual(result['status'],'available')
            self.assertTrue((Path(directory)/'NIO_Bay_of_Bengal_latest.jpg').exists())
    def test_trusted_hosts(self):
        self.assertFalse(satellite.trusted('https://mausam.imd.gov.in.evil.test/image.jpg'))
        self.assertFalse(satellite.trusted('file:///etc/passwd'))

if __name__=='__main__': unittest.main()
