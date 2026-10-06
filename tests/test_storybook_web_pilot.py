import copy
import json
from pathlib import Path
import tempfile
from decimal import Decimal
import unittest
from scripts.storybooks.web_pilot import web_request, history_matches, charge, ui_binding
from src.services.guided_tts.campaign import CampaignError


class WebsitePilotTests(unittest.TestCase):
    def setUp(self):
        self.request = {'cache_key':'a'*64,'text':'Marta está aquí.','voice_id':'voice-es',
            'model_id':'eleven_v4','settings':{'stability':.5,'similarity_boost':.75}}
        self.item = {'history_item_id':'new','request_id':'receipt','date_unix':200,
            'dialogue':[{'text':self.request['text'],'voice_id':'voice-es'}],
            'model_id':'eleven_v4','settings':{'stability':.5},'output_format':'mp3_44100_128',
            'character_count_change_from':10,'character_count_change_to':26}

    def test_web_cache_is_distinct_and_deterministic(self):
        result = web_request(self.request)
        self.assertNotEqual(result['cache_key'],self.request['cache_key'])
        self.assertEqual(result,web_request(self.request))
        self.assertEqual(result['sourceCacheKey'],self.request['cache_key'])

    def test_exact_history(self):
        self.assertTrue(history_matches(self.item,self.request,{'old'},190))

    def test_wrong_history_never_matches(self):
        for key,value in [('history_item_id','old'),('date_unix',180),('model_id','eleven_multilingual_v2'),
                          ('request_id',None),('output_format','wav_44100'),('settings',{'stability':.8}),
                          ('dialogue',[{'text':'Something else','voice_id':'voice-es'}]),
                          ('dialogue',[{'text':self.request['text'],'voice_id':'wrong'}])]:
            item = copy.deepcopy(self.item); item[key]=value
            with self.subTest(key=key,value=value):
                self.assertFalse(history_matches(item,self.request,{'old'},190))

    def test_charge_requires_exact_account_delta_and_bound(self):
        self.assertEqual(charge(self.item,Decimal(10),Decimal(26),160),16)
        for before,after,limit in [(10,27,160),(10,26,15),(26,26,160)]:
            with self.subTest(before=before,after=after,limit=limit):
                with self.assertRaises(CampaignError):
                    charge(self.item,Decimal(before),Decimal(after),limit)

    def test_ui_evidence_is_exact_recent_and_hashed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'ui.json'
            ui = {'observedAt':'2026-10-06T10:00:00+00:00','locale':'es-ES',
                  'text':self.request['text'],'voiceId':'voice-es','modelLabel':'Eleven v4',
                  'sliders':[{'label':'Stability','value':'0.5'},{'label':'Similarity','value':'0.75'}],
                  'outputLabel':'MP3 44.1 kHz (128kbps)','screenshot':'before.jpg','dom':'before.txt'}
            (path.parent/'before.jpg').write_bytes(b'screenshot')
            (path.parent/'before.txt').write_text('UI controls')
            path.write_text(json.dumps(ui))
            binding = ui_binding(path,self.request,'es-ES',1791280860)
            self.assertEqual(len(binding['assets']['screenshot']['sha256']),64)
            for key,value in [('voiceId','wrong'),('text','wrong'),('sliders',[]),
                              ('observedAt','2026-10-05T10:00:00+00:00'),('locale','en-GB')]:
                bad=copy.deepcopy(ui);bad[key]=value;path.write_text(json.dumps(bad))
                with self.subTest(key=key):
                    with self.assertRaises(CampaignError):ui_binding(path,self.request,'es-ES',1791280860)
            path.write_text(json.dumps(ui));(path.parent/'before.jpg').unlink()
            with self.assertRaises(FileNotFoundError):ui_binding(path,self.request,'es-ES',1791280860)


if __name__ == '__main__':
    unittest.main()
