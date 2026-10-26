"""Focused regression checks. No server restart, PDF writes or network needed."""
import unittest
from unittest.mock import patch
import deck
import server

class RoomTests(unittest.TestCase):
    def room(self):
        with patch.object(server.threading.Thread, 'start'):
            return server.Room()

    def test_complete_word_deal_at_every_room_size(self):
        for kind in ('mixed', 'prior'):
            for n in range(201):
                pack = deck.word_pack(n, kind)
                left = {a for sheet in pack['sheets'] for a,b in sheet}
                right = {b for sheet in pack['sheets'] for a,b in sheet}
                self.assertLessEqual(right, left, (kind,n))
                self.assertTrue(set(pack['starts']) <= left)
                self.assertTrue(all(len(s)==24 for s in pack['sheets']))

    def test_reserve_bots_cover_every_unoccupied_word_sheet(self):
        r=self.room()
        for kind in ('mixed','prior'):
            r.sentence_deck=kind
            for n in (0,5,7,16,21,46,200):
                r.phones={f'p{i}':i for i in range(1,min(n,3)+1)}
                r.bots=n-len(r.phones)
                slots=set(range(1,len(deck.word_sheets(n,kind))+1))
                self.assertEqual(set(r.word_bot_seats()),slots-set(r.phones.values()))
                r.timers=[]
                v=r.open('word','word',cue=deck.word_pack(n,kind)['start'])
                self.assertEqual({s for _,_,_,s in r.timers},set(r.word_bot_seats()))
                self.assertGreater(r.tally(v)['matching'],0)

    def test_no_word_is_not_a_candidate(self):
        r=self.room();v=r.open('word','word',cue='RED:one')
        r.ballot(v,1,'__no_word__')
        self.assertEqual(r.tally(v)['counts'],{})
        self.assertEqual(r.tally(v)['total'],0)
        r.ballot(v,1,'BLUE:night')
        self.assertEqual(r.tally(v)['counts'],{'BLUE:night':1})

    def test_transition_clears_votes_not_people(self):
        r=self.room();r.enter('sentences');r.phones={'one':1}
        r.open('word','word',cue='RED:one');self.assertTrue(r.timers)
        r.enter('rover')
        self.assertEqual(r.votes,{});self.assertEqual(r.timers,[])
        self.assertEqual(r.phones,{'one':1});self.assertEqual(r.bots,5)
        r.open('A','rover');r.enter('rover');self.assertIn('A',r.votes)
        r.enter('collaborative');self.assertEqual(r.votes,{})

    def test_extended_votes_use_three_teams(self):
        r=self.room();r.bots=200
        team_a=[s for s in r.bot_seats() if deck.ext_team(s)=='A']
        key=next(k for k,_ in deck.EXTENDED['seats'][0])  # a cue seat 1 (Team A) holds
        v=r.open('EA','extended',cue=key)
        voters={s for _,_,_,s in r.timers}
        self.assertTrue(voters and voters<=set(team_a))
        self.assertTrue(all(deck.ext_team(s)=='A' for s in voters))
        tally=r.tally(v)
        self.assertEqual(tally['eligible'],len(team_a));self.assertGreater(tally['matching'],0)
        self.assertEqual(tally['status'],'waiting')
        seat=next(s for s in team_a if r.choices(v,s))
        self.assertTrue(set(r.choices(v,seat))<={'weather','expense','harvest','cash','school'})
        self.assertNotIn(key.split(':')[1],r.choices(v,seat))  # never the card already face up
        r.ballot(v,seat,r.choices(v,seat)[0]);self.assertEqual(r.tally(v)['status'],'voting')
        self.assertEqual(r.tally(r.open('EB','extended',cue='C01:nothing:here'))['status'],'no-data')
        # A phone sees its Extended vote; the four room teams are untouched.
        r.phones={'p':1};self.assertEqual(r.me('p')['vote']['kind'],'extended')
        self.assertTrue(all(deck.in_vote(s,'A')==(deck.team(s)=='A') for s in range(1,41)))

    def test_household_votes_use_three_teams(self):
        r=self.room();r.bots=200
        hh=r.open('HA','household',cue='C01:cash:loan')
        voters={s for _,vid,_,s in r.timers if vid==hh['id']}
        self.assertTrue(voters and all(deck.hh_team(s)=='A' for s in voters))
        self.assertEqual(r.tally(hh)['eligible'],sum(deck.hh_team(s)=='A' for s in r.bot_seats()))
        self.assertEqual([sum(deck.hh_team(s)==t for s in range(1,201)) for t in 'ABC'],[67,67,66])
        # Rover keeps the four room teams; a phone sees its Households team's vote.
        self.assertTrue(all(deck.in_vote(s,'A')==(deck.team(s)=='A') for s in range(1,41)))
        r.phones={'p':3};r.open('HC','household',cue='C01:cash:loan')
        self.assertEqual(r.me('p')['vote']['kind'],'household');self.assertEqual(r.sheet(3)['hhTeam'],'C')

    def test_home_vote_asks_the_whole_room(self):
        r=self.room();r.bots=200
        key=next(k for k,_ in deck.EXTENDED['home'][0])  # a Part 2 cue seat 1 holds
        v=r.open('EH','home',cue=key,exclude=[key.split(':')[1]])
        voters={s for _,_,_,s in r.timers}
        self.assertTrue({deck.ext_team(s) for s in voters}=={'A','B','C'})  # every team answers
        tally=r.tally(v);self.assertEqual(tally['eligible'],200);self.assertGreater(tally['matching'],0)
        seat=next(s for s in r.bot_seats() if r.choices(v,s))
        self.assertTrue(set(r.choices(v,seat))<={'weather','expense','harvest','cash','school'})
        self.assertNotIn(key.split(':')[1],r.choices(v,seat))
        r.phones={'p':1};self.assertEqual(r.me('p')['vote']['kind'],'home')

    def test_no_data_waiting_and_voting_are_distinct(self):
        r=self.room();r.bots=20
        empty=r.open('HA','household',cue='C04:harvest:good')
        self.assertEqual(r.tally(empty)['status'],'no-data')
        useful=r.open('HA','household',cue='C01:cash:loan')
        tally=r.tally(useful)
        self.assertGreater(tally['matching'],0);self.assertEqual(tally['status'],'waiting')
        seat=next(s for s in r.bot_seats() if deck.hh_team(s)=='A' and r.choices(useful,s))
        r.ballot(useful,seat,r.choices(useful,seat)[0])
        self.assertEqual(r.tally(useful)['status'],'voting')
        excluded=r.open('HA','household',cue='C01:cash:loan',exclude=deck.FLIPS)
        self.assertEqual(r.tally(excluded)['status'],'no-data')
        self.assertFalse(r.choices(excluded,seat))

if __name__=='__main__': unittest.main()
